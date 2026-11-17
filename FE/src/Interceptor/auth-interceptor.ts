import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL, AuthService } from '../Services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // only send our token to OUR backend (not to fakestoreapi or other sites)
  if (!req.url.startsWith(API_URL)) return next(req);

  const token = authService.getToken();
  const prefix = authService.getRole() === 'admin' ? 'admin' : 'user';

  const authReq = token ? req.clone({ setHeaders: { x: `${prefix} ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthCall = /\/(login|register|reset_password|change_password)/i.test(req.url);

      if (err.status === 401 && !isAuthCall) {
        // backend refreshed an expired token -> save it and retry the request once
        const refreshed: string | undefined = err.error?.Refreshtoken;
        if (refreshed) {
          authService.replaceToken(refreshed);
          return next(req.clone({ setHeaders: { x: `${prefix} ${refreshed}` } }));
        }

        authService.logout();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    })
  );
};
