import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from '../Guards/auth.guard';

// every page is lazy: its code is downloaded only when the user opens it


export const routes: Routes = [
  {path: '', redirectTo: '/home', pathMatch: 'full'},
  {path:'home', loadComponent:()=>import('../Components/home/home').then((m)=>m.Home)},
  {path:'about', loadComponent:()=>import('../Components/about/about').then((m)=>m.About)},
  {path:'login', canActivate:[guestGuard], loadComponent:()=>import('../Components/Sign/login/login').then((m)=>m.Login)},
  {path:'register', canActivate:[guestGuard], loadComponent:()=>import('../Components/Sign/register/register').then((m)=>m.RegisterComponent)},
  {path:'search', loadComponent:()=>import('../Components/search/search').then((m)=>m.Search)},
  {path:'products', loadComponent:()=>import('../Components/Product/product-list/product-list').then((m)=>m.ProductsList)},
  {path:'category/:id', loadComponent:()=>import('../Components/category/category').then((m)=>m.Category)},
  {path:'product/:id', loadComponent:()=>import('../Components/Product/product-details/product-details').then((m)=>m.ProductDetails)},
  {path:'cart', canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/cart/cart').then((m)=>m.Cart)},
  {path:'checkout', canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/checkout/checkout').then((m)=>m.Checkout)},
  {path:'payment/success', data:{mode:'success'}, canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/payment-result/payment-result').then((m)=>m.PaymentResult)},
  {path:'payment/cancel', data:{mode:'cancel'}, canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/payment-result/payment-result').then((m)=>m.PaymentResult)},
  {path:'account-activated', loadComponent:()=>import('../Components/Sign/account-activated/account-activated').then((m)=>m.AccountActivated)},
  {path:'forgot-password', loadComponent:()=>import('../Components/Sign/forgot-password/forgot-password').then((m)=>m.ForgotPassword)},
  {path:'reset-password/:token', loadComponent:()=>import('../Components/Sign/reset-password/reset-password').then((m)=>m.ResetPassword)},
  {path:'profile', canActivate:[authGuard], loadComponent:()=>import('../Components/profile/profile').then((m)=>m.Profile)},
  {path:'wishlist', canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/wishlist/wishlist').then((m)=>m.Wishlist)},
  {
    path:'admin',
    canActivate:[roleGuard(['admin'])],
    loadComponent:()=>import('../Components/admin/admin-layout/admin-layout').then((m)=>m.AdminLayout),
    children:[
      {path:'', redirectTo:'dashboard', pathMatch:'full'},
      {path:'dashboard', loadComponent:()=>import('../Components/admin/dashboard/dashboard').then((m)=>m.Dashboard)},
      {path:'catalog', loadComponent:()=>import('../Components/admin/catalog/catalog').then((m)=>m.AdminCatalog)},
      {path:'add-product', loadComponent:()=>import('../Components/admin/add-product/add-product').then((m)=>m.AddProduct)},
      {path:'products', loadComponent:()=>import('../Components/admin/manage-products/manage-products').then((m)=>m.ManageProducts)},
      {path:'orders', loadComponent:()=>import('../Components/admin/orders/orders').then((m)=>m.AdminOrders)},
      {path:'coupons', loadComponent:()=>import('../Components/admin/coupons/coupons').then((m)=>m.AdminCoupons)},
    ]
  },
  {path: '**', loadComponent:()=>import('../Components/notfound/notfound').then((m)=>m.Notfound)}
];
