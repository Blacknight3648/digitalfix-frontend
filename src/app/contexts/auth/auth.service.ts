import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { APP_ROLES, AppRole, AppUser } from '@models/user.model';
import { UserSession } from '@remote/dto/user.dto';
import { clearMsalTemporaryState } from './auth-startup';
import { environment } from '@config/environment';

const DEFAULT_ROLE: AppRole = 'CLIENTE';
const LOGIN_SCOPES = environment.azure.protectedResourceScopes;
const LOGOUT_NOTIFY_TIMEOUT_MS = 3000;
const SESSION_ATTEMPTS = 5;
const SESSION_RETRY_DELAY_MS = 2000;
// Si guardas claves propias en storage, agrégalas aquí para limpiarlas sin borrar otras cosas.
const CUSTOM_STORAGE_KEYS: readonly string[] = [
  // 'df_session',
  // 'df_role',
];

export const backendCaido = signal<boolean>(false);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msalService = inject(MsalService, { optional: true });
  private readonly http = inject(HttpClient);
  private readonly plainHttp = new HttpClient(inject(HttpBackend));
  private sessionRequest: Promise<void> | null = null;
  private forceNextTokenRefresh = false;

  readonly currentUser = signal<AppUser | null>(null);

  // Marca que el próximo pedido de token tras un login debe pedir uno fresco.
  markFreshTokenNeeded(): void {
    this.forceNextTokenRefresh = true;
  }

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

        if (!status || status === 0 || status >= 500) {
          backendCaido.set(true);
          this.sessionRequest = null;
        } else {
          backendCaido.set(false);
          await this.clearLocalSession();
        }
      });
    return this.sessionRequest;
  }

  reintentarConexion(): Promise<void> {
    backendCaido.set(false);
    this.sessionRequest = null;
    return this.loadSession();
  }

  private async fetchSession(): Promise<UserSession> {
    let lastError: unknown = null;
    let refreshedAfter401 = false;

    // Si venimos de un login nuevo, forzamos un token fresco una sola vez
    // antes de consultar /api/v1/login/me.
    if (this.forceNextTokenRefresh) {
      this.forceNextTokenRefresh = false;
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
          continue;
        }
        if (status === 401 || status === 403) {
          throw err;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
    }
    throw lastError;
  }

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

  setRoleOverride(role: AppRole): void {
    const user = this.currentUser();
    if (user?.assignedRole === 'SUPERADMIN') {
      this.currentUser.set({ ...user, role });
    }
  }

  private limpiarAlmacenamiento(): void {
    if (typeof window === 'undefined') {
      return;
    }
    for (const key of CUSTOM_STORAGE_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  }

  async clearLocalSession(): Promise<void> {
    this.currentUser.set(null);
    this.sessionRequest = null;
    this.forceNextTokenRefresh = false;
    this.limpiarAlmacenamiento();

    const msal = this.msalService?.instance;
    if (!msal) {
      return;
    }
    msal.setActiveAccount(null);
    await msal.clearCache();
    clearMsalTemporaryState();
  }

  async login(loginHint?: string): Promise<void> {
    await this.clearLocalSession();
    this.markFreshTokenNeeded();
    await this.msalService?.instance.loginRedirect({
      scopes: LOGIN_SCOPES,
      loginHint,
      prompt: 'select_account',
    });
  }

  async logout(): Promise<void> {
    const msal = this.msalService?.instance;
    const account = msal?.getActiveAccount() ?? null;
    this.currentUser.set(null);
    this.sessionRequest = null;
    this.forceNextTokenRefresh = false;

    await this.notifyBackendLogout();
    this.limpiarAlmacenamiento();
    msal?.setActiveAccount(null);
    await msal?.clearCache();
    clearMsalTemporaryState();
    await msal?.logoutRedirect({
      account,
      postLogoutRedirectUri: environment.azure.postLogoutRedirectUri,
    });
  }

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

  private resolveRole(roles: string[], fallback: AppRole = DEFAULT_ROLE): AppRole {
    const upper = roles.map((role) => role.toUpperCase());
    return APP_ROLES.find((role) => upper.includes(role)) ?? fallback;
  }
}