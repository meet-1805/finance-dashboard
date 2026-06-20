import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const onboardingGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.isLoggedIn()) {
    const user = authService.getCurrentUser();
    if (user?.onboardingState === 'PENDING') {
      return true;
    } else {
      router.navigate(['/dashboard']);
      return false;
    }
  }

  router.navigate(['/']);
  return false;
};
