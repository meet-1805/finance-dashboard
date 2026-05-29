import { authGuard } from './guards/auth.guard';
import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.Login)
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register').then((m) => m.Register)
  },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard]
  },

  {
    path: 'income',
    loadComponent: () =>
      import('./pages/income/income').then((m) => m.Income),
    canActivate: [authGuard]
  },

  {
    path: 'expenses',
    loadComponent: () =>
      import('./pages/expenses/expenses').then((m) => m.Expenses),
    canActivate: [authGuard]
  },

  {
    path: 'budgets',
    loadComponent: () =>
      import('./pages/budgets/budgets').then((m) => m.Budgets),
    canActivate: [authGuard]
  },

  {
    path: 'reports',
    loadComponent: () =>
      import('./pages/reports/reports').then((m) => m.Reports),
    canActivate: [authGuard]
  },

  {
    path: '**',
    redirectTo: ''
  }

];
