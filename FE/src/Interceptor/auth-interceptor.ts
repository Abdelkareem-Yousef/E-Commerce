import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_URL, AuthService } from '../Services/auth';

// these answer 401 for their own reasons (wrong password, no session...) -> never refresh-and-retry them
const AUTH_CALLS = /\/(login|register|reset_password|change_password|refresh|logout)(\?|$)/i;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // only OUR backend gets the token and the cookie (not Cloudinary or any other site)
  if (!req.url.startsWith(API_URL)) return next(req);

  // send / accept the httpOnly refresh cookie (needed on localhost, where the API is another origin)
  const base = req.clone({ withCredentials: true });

  const withToken = (r: HttpRequest<unknown>, token: string | null) =>
    token ? r.clone({ setHeaders: { x: `${auth.prefixFor(token)} ${token}` } }) : r;

  return next(withToken(base, auth.getToken())).pipe(
    catchError((err: HttpErrorResponse) => {
      // only a logged-in request that got 401 can be saved by a refresh
      if (err.status !== 401 || AUTH_CALLS.test(req.url) || !auth.getToken()) {
        return throwError(() => err);
      }

      // access token expired (or session gone): ask /refresh once. Requests failing at the same
      // moment share that one refresh, then each is retried with the new token.
      return auth.refresh().pipe(
        switchMap((token) => {
          if (!token) {
            router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
            return throwError(() => err);
          }
          return next(withToken(base, token));
        })
      );
    })
  );
};
