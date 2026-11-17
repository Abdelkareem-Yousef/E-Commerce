import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../Services/auth';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  auth = inject(AuthService);
  private router = inject(Router);

  /** sidebar open on small screens */
  open = signal(false);

  links = [
    { path: '/admin/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
    { path: '/admin/catalog', icon: 'bi-diagram-3', label: 'Categories & brands' },
    { path: '/admin/add-product', icon: 'bi-plus-square', label: 'Add product' },
    { path: '/admin/products', icon: 'bi-box-seam', label: 'Manage products' },
    { path: '/admin/orders', icon: 'bi-receipt', label: 'Orders' },
    { path: '/admin/coupons', icon: 'bi-ticket-perforated', label: 'Coupons' },
  ];

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
