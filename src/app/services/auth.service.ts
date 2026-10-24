import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { APP_ROLES, AppRole, AppUser, UserSession } from '../model/user.model';
import { clearMsalTemporaryState } from '../config/auth-startup';
import { environment } from '../environment/environment';

// El rol se lee de los claims: primero lo que resuelve ms-login (App Roles del
// claim "roles" del access token + rol del usuario en ms-user) y, si el backend
// no responde, el claim "roles" del id token. Sin ninguno de los dos se usa el
// de menor privilegio, igual que el alta automática de ms-user.
const DEFAULT_ROLE: AppRole = 'CLIENTE';
// El login ya pide el scope de la API, así el consentimiento ocurre al entrar
// y MsalInterceptor obtiene el access token en silencio desde el primer request.
const LOGIN_SCOPES = environment.azure.protectedResourceScopes;
const LOGOUT_NOTIFY_TIMEOUT_MS = 3000;
const SESSION_ATTEMPTS = 3;
const SESSION_RETRY_DELAY_MS = 1500;

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
        if (current?.email === account.username) {
            return;
        }
        const claimedRole = this.resolveRole(this.claimRoles(account.idTokenClaims));
        this.currentUser.set({
            name: account.name ?? account.username,
            email: account.username,
            role: claimedRole,
            assignedRole: claimedRole,
            scopes: [],
        });
    }

    // Pide a ms-login la sesión según el access token validado (roles y scopes).
    // Se hace una vez por sesión; authGuard la espera antes de que roleGuard lea
    // el rol, así las vistas corresponden al rol real desde la primera pantalla.
    // Solo se memoriza una sesión completa: si ms-login falla o responde sin
    // roles (ms-user aún no levanta), se mantiene el rol del id token y se
    // vuelve a consultar en la próxima navegación, en vez de quedar como CLIENTE
    // hasta cerrar sesión.
    loadSession(): Promise<void> {
        this.syncFromActiveAccount();
        this.sessionRequest ??= this.fetchSession()
            .then((session) => {
                const user = this.currentUser();
                if (user) {
                    const assignedRole = this.resolveRole(session.roles, user.assignedRole);
                    this.currentUser.set({ ...user, role: assignedRole, assignedRole, scopes: session.scopes });
                }
                if (session.roles.length === 0) {
                    this.sessionRequest = null;
                }
            })
            .catch((err) => {
                console.warn('[Auth] No se pudo obtener la sesión desde ms-login:', err);
                this.sessionRequest = null;
            });
        return this.sessionRequest;
    }

    // Reintenta mientras la respuesta venga incompleta: justo después de
    // levantar los contenedores, ms-user tarda unos segundos más que ms-login.
    private async fetchSession(): Promise<UserSession> {
        let lastError: unknown = null;
        for (let attempt = 1; attempt <= SESSION_ATTEMPTS; attempt++) {
            try {
                const session = await firstValueFrom(
                    this.http.get<UserSession>(`${environment.bffUrl}/api/v1/login/me`),
                );
                if (session.roles.length > 0 || attempt === SESSION_ATTEMPTS) {
                    return session;
                }
            } catch (err) {
                lastError = err;
            }
            await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
        }
        throw lastError;
    }

    // "Ver como…": solo un SUPERADMIN puede revisar la app con las vistas de otro
    // rol. Solo cambia la UI; el backend sigue autorizando con su rol real.
    setRoleOverride(role: AppRole): void {
        const user = this.currentUser();
        if (user?.assignedRole === 'SUPERADMIN') {
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
        // logoutRedirect solo borra la cuenta que cierra sesión; si quedara otra
        // en el cache, al volver a '' prepareAuth la activaría y se entraría
        // directo con ella. Se limpia todo antes (la cuenta capturada arriba
        // conserva el id token que Microsoft usa como hint del logout).
        msal?.setActiveAccount(null);
        await msal?.clearCache();
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
                this.plainHttp.post(`${environment.bffUrl}/api/v1/login/logout`, null, {
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

    // Rol de mayor prioridad que reconoce la UI (el backend puede devolver otros,
    // como TECNICO, que no tienen pantallas propias).
    private resolveRole(roles: string[], fallback: AppRole = DEFAULT_ROLE): AppRole {
        const upper = roles.map((role) => role.toUpperCase());
        return APP_ROLES.find((role) => upper.includes(role)) ?? fallback;
    }
}
