import { Component, computed, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Product, brandName } from '../../../Services/product';
import { AuthService } from '../../../Services/auth';
import { WishlistService } from '../../../Services/wishlist';
import { CartService } from '../../../Services/Cart';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  product = input.required<Product>();

  auth = inject(AuthService);
  wishlist = inject(WishlistService);
  private cart = inject(CartService);
  private router = inject(Router);

  busy = signal(false);
  adding = signal(false);
  added = signal(false);

  brand = computed(() => brandName(this.product()));
  soldOut = computed(() => this.product().stock < 1);
  lowStock = computed(() => this.product().stock > 0 && this.product().stock <= 5);
  /** "New" badge for products added in the last 14 days */
  isNew = computed(() => {
    const d = this.product().createdAt;
    return !!d && Date.now() - new Date(d).getTime() < 14 * 24 * 60 * 60 * 1000;
  });

  private needLogin(): boolean {
    if (this.auth.isLoggedIn()) return false;
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return true;
  }

  toggleWishlist(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.needLogin()) return;
    this.busy.set(true);
    this.wishlist.toggle(this.product()._id).subscribe({
      next: () => this.busy.set(false),
      error: () => this.busy.set(false),
    });
  }

  quickAdd(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.needLogin() || this.soldOut()) return;
    this.adding.set(true);
    this.cart.add(this.product()._id, 1).subscribe({
      next: () => {
        this.adding.set(false);
        this.added.set(true);
        setTimeout(() => this.added.set(false), 1600);
      },
      error: () => this.adding.set(false),
    });
  }
}
