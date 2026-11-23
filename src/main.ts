import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { APP_ROLES, AppRole, AppUser } from '@models/user.model';
import { UserSession } from '@remote/dto/user.dto';
import { environment } from '@config/environment';
import { clearMsalTemporaryState } from '@contexts/auth/auth-startup';

// El rol se lee de los claims: primero lo que resuelve ms-login (App Roles del
// claim "roles" del access token + rol del usuario en ms-user) y, si el backend
// no responde, el claim "roles" del id token. Sin ninguno de los dos se usa el
// de menor privilegio, igual que el alta automática de ms-user.
const DEFAULT_ROLE: AppRole = 'CLIENTE';
// El login ya pide el scope de la API, así el consentimiento ocurre al entrar
// y MsalInterceptor obtiene el access token en silencio desde el primer request.
const LOGIN_SCOPES = environment.azure.protectedResourceScopes;
const LOGOUT_NOTIFY_TIMEOUT_MS = 3000;
const SESSION_ATTEMPTS = 5;
const SESSION_RETRY_DELAY_MS = 2000;
// Señal pública: true si el backend no responde después de todos los reintentos.
export const backendCaido = signal<boolean>(false);

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

  // True justo después de volver de Microsoft con un login exitoso.
  private freshTokenNeeded = false;

  readonly currentUser = signal<AppUser | null>(null);

  // Lo llama main.ts cuando prepareAuth detecta un login recién completado.
  // El siguiente fetchSession() pedirá un token nuevo a Microsoft en vez de
  // reutilizar el que MSAL tenga guardado.
  markFreshTokenNeeded(): void {
    this.freshTokenNeeded = true;
  }

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
        backendCaido.set(false);
        const user = this.currentUser();
        if (user) {
          const assignedRole = this.resolveRole(session.roles, user.assignedRole);
          this.currentUser.set({ ...user, role: assignedRole, assignedRole, scopes: session.scopes });
        }
        if (session.roles.length === 0) {
          this.sessionRequest = null;
        }
      })
      .catch(async (err) => {
        const status = (err as { status?: number })?.status;
        console.warn('[Auth] No se pudo obtener la sesión desde ms-login:', err);

        // Solo marcar backendCaido si hubo fallo de red (status 0/undefined) o error de servidor (>= 500).
        // Un 401 indica problema de token/sesión, no que el servidor esté caído.
        if (!status || status === 0 || status >= 500) {
          backendCaido.set(true);
          this.sessionRequest = null;
        } else {
          backendCaido.set(false);
          // Un 401/403 que persiste después del refresh forzado significa
          // que el token guardado ya no sirve (por ejemplo, fue emitido antes de
          // un logout). Se borra la cache de MSAL para que el próximo login parta
          // limpio y no se reenvíe el mismo token inválido en cada request.
          await this.clearLocalSession();
        }
      });
    return this.sessionRequest;
  }

  // Permite reintentar la conexión desde la pantalla de sistema caído.
  reintentarConexion(): Promise<void> {
    backendCaido.set(false);
    this.sessionRequest = null;
    return this.loadSession();
  }

  // Reintenta mientras la respuesta venga incompleta (ej. ms-user aún levantando).
  // Tras un login recién hecho se parte de un token nuevo, y ante el
  // primer 401 se fuerza UN token nuevo a Microsoft (ignora la cache de MSAL)
  // y se reintenta. Si vuelve a dar 401/403 se detiene: es un rechazo real.
  private async fetchSession(): Promise<UserSession> {
    let lastError: unknown = null;
    let refreshedAfter401 = false;

    // Tras volver de Microsoft con un login exitoso, se pide un token
    // fresco en vez de usar el que MSAL tenga guardado.
    if (this.freshTokenNeeded) {
      this.freshTokenNeeded = false;
      await this.forceTokenRefresh();
    }

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
        const status = (err as { status?: number })?.status;

        if (status === 401 && !refreshedAfter401 && (await this.forceTokenRefresh())) {
          refreshedAfter401 = true;
          continue; // reintenta de inmediato con el token nuevo, sin espera
        }
        if (status === 401 || status === 403) {
          throw err;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
    }
    throw lastError;
  }

  // Pide a Microsoft un access token nuevo saltándose la cache de MSAL.
  // Devuelve true si lo consiguió (queda guardado en la cache y MsalInterceptor
  // lo usará en el siguiente request).
  private async forceTokenRefresh(): Promise<boolean> {
    const msal = this.msalService?.instance;
    const account = msal?.getActiveAccount();
    if (!msal || !account) {
      return false;
    }
    try {
      await msal.acquireTokenSilent({
        account,
        scopes: environment.azure.protectedResourceScopes,
        forceRefresh: true,
      });
      return true;
    } catch (err) {
      console.warn('[Auth] No se pudo renovar el token a la fuerza:', err);
      return false;
    }
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
    this.freshTokenNeeded = false; // no dejar una marca vieja pendiente
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
    this.freshTokenNeeded = false;

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