import { InjectionToken } from '@angular/core';
import {
  AccountInfo,
  EventType,
  IPublicClientApplication,
  NavigationClient,
  NavigationOptions,
} from '@azure/msal-browser';

export const AUTH_REDIRECT_ERROR = new InjectionToken<string | null>('AUTH_REDIRECT_ERROR');

export interface AuthStartupResult {
  redirectError: string | null;
  didLogin: boolean;
}

class ReplaceHistoryNavigationClient extends NavigationClient {
  override navigateExternal(url: string, options: NavigationOptions): Promise<boolean> {
    return super.navigateExternal(url, { ...options, noHistory: true });
  }
}

export function clearMsalTemporaryState(): void {
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('msal.'))
      .forEach((key) => sessionStorage.removeItem(key));
  }
  if (typeof localStorage !== 'undefined') {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('msal.') && (key.includes('interaction') || key.includes('request')))
      .forEach((key) => localStorage.removeItem(key));
  }
}

export async function prepareAuth(msal: IPublicClientApplication): Promise<AuthStartupResult> {
  await msal.initialize();
  msal.setNavigationClient(new ReplaceHistoryNavigationClient());

  msal.addEventCallback((event) => {
    const account = (event.payload as { account?: AccountInfo } | null)?.account;
    if ((event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) && account) {
      msal.setActiveAccount(account);
    }
  });

  let redirectError: string | null = null;
  let didLogin = false;

  try {
    const result = await msal.handleRedirectPromise();
    if (result?.account) {
      msal.setActiveAccount(result.account);
      didLogin = true;
    }
  } catch (err) {
    console.error('[MSAL] Error al procesar el regreso desde Microsoft:', err);
    redirectError = (err as { errorCode?: string })?.errorCode ?? 'unknown_error';
    clearMsalTemporaryState();
  }

  if (!msal.getActiveAccount()) {
    const [cachedAccount] = msal.getAllAccounts();
    if (cachedAccount) {
      msal.setActiveAccount(cachedAccount);
    }
  }

  return { redirectError, didLogin };
}