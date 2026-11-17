import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth';

/** page needs a logged-in account (any role) */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** page needs one of these roles, e.g. roleGuard(['admin']) */
export const roleGuard = (roles: string[]): CanActivateFn => (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (roles.includes(auth.getRole() ?? '')) return true;

  // logged in but wrong role -> send them to their own home page
  return router.createUrlTree([auth.isAdmin() ? '/admin' : '/home']);
};

/** login / register pages: only for people who are NOT logged in */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;
  return router.createUrlTree([auth.isAdmin() ? '/admin' : '/home']);
};
