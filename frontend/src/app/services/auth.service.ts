import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { AppRole, AppUser, UserSession } from '../model/user.model';
import { clearMsalTemporaryState } from '../config/auth-startup';
import { environment } from '../environment/environment';

// El rol se lee de los claims: primero lo que resuelve ms-login (App Roles del
// claim "roles" del access token + rol del usuario en ms-user) y, si el backend
// no responde, el claim "roles" del id token. Mientras el tenant no tenga App
// Roles asignados ni el usuario esté en ms-user, se usa Admin (equipo de demo).
const DEFAULT_ROLE: AppRole = 'ADMIN';
const VALID_ROLES: AppRole[] = ['ADMIN', 'SUPERVISOR', 'CLIENTE', 'AUDITOR'];
// El login ya pide el scope de la API, así el consentimiento ocurre al entrar
// y MsalInterceptor obtiene el access token en silencio desde el primer request.
const LOGIN_SCOPES = environment.azure.protectedResourceScopes;
const LOGOUT_NOTIFY_TIMEOUT_MS = 3000;

@Injectable({ providedIn: 'root' })
export class AuthService {
    // Opcional por la misma razón que en LoginComponent: MSAL solo existe en el navegador.
    private readonly msalService = inject(MsalService, { optional: true });
    // HttpClient con MsalInterceptor: adjunta el Bearer token y lo renueva.
    private readonly http = inject(HttpClient);
    // HttpClient sin interceptores: el aviso de logout no debe disparar un
    // redirect de MsalInterceptor si el token ya no se puede renovar.
    private readonly plainHttp = new HttpClient(inject(HttpBackend));
    private sessionRequest: Promise<void> | null = null;

    readonly currentUser = signal<AppUser | null>(null);

    // Vuelca la cuenta activa de MSAL al estado de la app. Se llama después de un
    // login exitoso y también al entrar a una página protegida por si la sesión
    // ya estaba activa en el cache (por ejemplo, al recargar /home).
    syncFromActiveAccount(): void {
        const account = this.msalService?.instance.getActiveAccount();
        if (!account) {
            this.currentUser.set(null);
            return;
        }

        const current = this.currentUser();
        this.currentUser.set({
            name: account.name ?? account.username,
            email: account.username,
            role: current?.email === account.username ? current.role : this.resolveRole(this.claimRoles(account.idTokenClaims)),
            scopes: current?.email === account.username ? current.scopes : [],
        });
    }

    // Pide a ms-login la sesión según el access token validado (roles y scopes).
    // Se hace una vez por sesión; authGuard la espera antes de que roleGuard lea
    // el rol, así las vistas corresponden al rol real desde la primera pantalla.
    loadSession(): Promise<void> {
        this.syncFromActiveAccount();
        this.sessionRequest ??= firstValueFrom(
            this.http.get<UserSession>(`${environment.apiBaseUrl}/api/v1/login/me`),
        )
            .then((session) => {
                const user = this.currentUser();
                if (user) {
                    this.currentUser.set({
                        ...user,
                        role: this.resolveRole(session.roles, user.role),
                        scopes: session.scopes,
                    });
                }
            })
            .catch((err) => {
                // Sin backend se mantienen los roles del id token; se reintenta en la próxima navegación.
                console.warn('[Auth] No se pudo obtener la sesión desde ms-login:', err);
                this.sessionRequest = null;
            });
        return this.sessionRequest;
    }

    // Selector de demo para simular los otros roles del caso en la UI. Solo cambia
    // las vistas: el backend sigue autorizando con el rol real del token/ms-user.
    setRoleOverride(role: AppRole): void {
        const user = this.currentUser();
        if (user) {
            this.currentUser.set({ ...user, role });
        }
    }

    // Deja el navegador sin rastro de sesiones anteriores: cuentas y tokens
    // (localStorage, vía clearCache) y redirects a medias (sessionStorage).
    // No llamar mientras se procesa la vuelta desde Microsoft: ese state es
    // justo el que MSAL necesita para validar la respuesta.
    async clearLocalSession(): Promise<void> {
        this.currentUser.set(null);
        this.sessionRequest = null;
        const msal = this.msalService?.instance;
        if (!msal) {
            return;
        }
        msal.setActiveAccount(null);
        await msal.clearCache();
        clearMsalTemporaryState();
    }

    // Todo inicio de sesión parte de un cache limpio, así un intento anterior
    // fallido o la cuenta de otra persona (PC compartido) no interfieren.
    async login(loginHint?: string): Promise<void> {
        await this.clearLocalSession();
        await this.msalService?.instance.loginRedirect({
            scopes: LOGIN_SCOPES,
            loginHint,
            // Sin esto Microsoft reutiliza su propia cookie de SSO y entra
            // directo con la última cuenta usada, aunque el cache local esté limpio.
            prompt: 'select_account',
        });
    }

    // Cierra la sesión en los tres lugares: backend (invalida los tokens ya
    // emitidos), cache local y Microsoft. Al volver, el login parte limpio.
    async logout(): Promise<void> {
        const msal = this.msalService?.instance;
        const account = msal?.getActiveAccount() ?? null;
        this.currentUser.set(null);
        this.sessionRequest = null;

        await this.notifyBackendLogout();
        clearMsalTemporaryState();
        await msal?.logoutRedirect({
            account,
            postLogoutRedirectUri: environment.azure.postLogoutRedirectUri,
        });
    }

    // Avisa a ms-login para que rechace cualquier token emitido antes de este
    // momento. Es best effort: si el backend no responde a tiempo o el token no
    // se puede obtener en silencio, el logout en Microsoft sigue igual.
    private async notifyBackendLogout(): Promise<void> {
        const msal = this.msalService?.instance;
        const account = msal?.getActiveAccount();
        if (!msal || !account) {
            return;
        }
        const sendLogout = async () => {
            const { accessToken } = await msal.acquireTokenSilent({
                account,
                scopes: environment.azure.protectedResourceScopes,
            });
            await firstValueFrom(
                this.plainHttp.post(`${environment.apiBaseUrl}/api/v1/login/logout`, null, {
                    headers: new HttpHeaders({ Authorization: `Bearer ${accessToken}` }),
                }),
            );
        };
        const giveUp = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), LOGOUT_NOTIFY_TIMEOUT_MS),
        );
        try {
            await Promise.race([sendLogout(), giveUp]);
        } catch (err) {
            console.warn('[Auth] No se pudo registrar el logout en el backend:', err);
        }
    }

    private claimRoles(claims: unknown): string[] {
        return (claims as { roles?: string[] } | undefined)?.roles ?? [];
    }

    // Primer rol reconocido por la UI (el backend puede devolver otros, como TECNICO).
    private resolveRole(roles: string[], fallback: AppRole = DEFAULT_ROLE): AppRole {
        const known = roles.map((role) => role.toUpperCase()).find((role) => VALID_ROLES.includes(role as AppRole));
        return (known as AppRole | undefined) ?? fallback;
    }
}
