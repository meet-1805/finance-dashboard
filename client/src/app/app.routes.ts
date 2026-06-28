import { authGuard } from './guards/auth.guard';
import { onboardingGuard } from './guards/onboarding.guard';
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
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
    canActivate: [onboardingGuard]
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
    path: 'import',
    loadComponent: () =>
      import('./pages/import/import').then((m) => m.ImportComponent),
    canActivate: [authGuard]
  },

  {
    path: 'import/review/:sessionId',
    loadComponent: () =>
      import('./pages/import-review/import-review').then((m) => m.ImportReviewComponent),
    canActivate: [authGuard]
  },

  {
    path: 'import/confirm/:sessionId',
    loadComponent: () =>
      import('./pages/import-confirm/import-confirm').then((m) => m.ImportConfirmComponent),
    canActivate: [authGuard]
  },

  {
    path: 'import/history',
    loadComponent: () =>
      import('./pages/import-history/import-history').then((m) => m.ImportHistoryComponent),
    canActivate: [authGuard]
  },

  {
    path: '**',
    redirectTo: ''
  }

];
