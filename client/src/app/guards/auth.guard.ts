import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (

  route,
  state

) => {

  const router = inject(Router);
  const authService = inject(AuthService);

  if(authService.isLoggedIn()){

    return true;

  }

  router.navigate(['/']);

  return false;

};
