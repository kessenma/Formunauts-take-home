import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const result = await authService.loadSession();
  // Only redirect on a definitive 401 — transient errors (server restarting,
  // network blip) leave the cookie valid, so let the user through.
  if (result === 'unauthenticated') {
    return router.createUrlTree(['/login']);
  }
  return true;
};
