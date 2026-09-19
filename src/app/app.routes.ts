import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/products').then((m) => m.Products),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/product-details/product-details').then(
        (m) => m.ProductDetails
      ),
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./features/compare/compare').then((m) => m.Compare),
  },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/orders').then((m) => m.Orders),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
  },
  {
    path: 'login',
    redirectTo: 'auth',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
