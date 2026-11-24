import { Injectable, inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class SessionExpiredInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private handlingSessionExpired = false;

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.url.includes('/api/v1/login/logout') || req.url.includes('/api/v1/login/me')) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 401 && !this.handlingSessionExpired) {
          this.handlingSessionExpired = true;
          void this.authService
            .clearLocalSession()
            .then(() => this.authService.login())
            .finally(() => {
              this.handlingSessionExpired = false;
            });
        }
        return throwError(() => err);
      }),
    );
  }
}