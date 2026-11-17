import { Routes } from '@angular/router';
import { Home } from '../Components/home/home';
import { Notfound } from '../Components/notfound/notfound';
import { About } from '../Components/about/about';
import { Login } from '../Components/Sign/login/login';
import { RegisterComponent } from '../Components/Sign/register/register';
import { Category } from '../Components/category/category';
import { ProductDetails } from "../Components/Product/product-details/product-details";
import { authGuard, guestGuard, roleGuard } from '../Guards/auth.guard';


export const routes: Routes = [
  {path: '', redirectTo: '/home', pathMatch: 'full'},
  {path:'home', loadComponent:()=>import('../Components/home/home').then((m)=>m.Home)},
  {path:'about', component:About},
  {path:'login', component:Login, canActivate:[guestGuard]},
  {path:'register', component:RegisterComponent, canActivate:[guestGuard]},
  {path:'category/:id', loadComponent:()=>import('../Components/category/category').then((m)=>m.Category)},
  {path:'product/:id', component:ProductDetails},
  {path:'cart', canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/cart/cart').then((m)=>m.Cart)},
  {path:'checkout', canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/checkout/checkout').then((m)=>m.Checkout)},
  {path:'payment/success', data:{mode:'success'}, canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/payment-result/payment-result').then((m)=>m.PaymentResult)},
  {path:'payment/cancel', data:{mode:'cancel'}, canActivate:[roleGuard(['user'])], loadComponent:()=>import('../Components/payment-result/payment-result').then((m)=>m.PaymentResult)},
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
  {path: '**', component:Notfound}
];
