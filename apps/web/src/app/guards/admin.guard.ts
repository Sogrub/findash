import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../store/auth.store';

export const adminGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.currentUser()?.role === 'ADMIN') return true;

  void router.navigate(['/dashboard']);
  return false;
};
