import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path:'',
        redirectTo:'dashboard',
        pathMatch:'full'
    },
    {
        path:'dashboard',
        loadComponent:()=>import('./features/dashboard/dashboard').then(m=>m.Dashboard)
    },
     {
        path:'cart',
        loadComponent:()=>import('./features/cart/cart').then(m=>m.Cart)
    },
    {
        path:'products',
        loadComponent:()=>import('./features/products/products').then(m=>m.Products)
    },
     {
        path:'orders',
        loadComponent:()=>import('./features/orders/orders').then(m=>m.Orders)
    },
      {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/product-details/product-details')
        .then(m => m.ProductDetails)
  },
];
