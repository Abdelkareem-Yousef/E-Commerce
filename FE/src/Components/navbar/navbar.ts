import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../Services/Cart';
import { AuthService } from '../../Services/auth';
import { WishlistService } from '../../Services/wishlist';
import { CategoryItem, ProductService } from '../../Services/product';


@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  cart = inject(CartService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);
  private router = inject(Router);
  private productService = inject(ProductService);

  /** categories from your backend (/get_all_category) */
  categories = signal<CategoryItem[]>([]);

  constructor() {
    // whenever the login state changes: load the cart + wishlist for users, empty it otherwise
    effect(() => {
      if (this.auth.isUser()) {
        this.cart.load().subscribe({ error: () => this.cart.reset() });
        this.wishlist.load().subscribe({ error: () => this.wishlist.reset() });
      } else {
        this.cart.reset();
        this.wishlist.reset();
      }
    });
  }

  ngOnInit() {
    this.productService.getCategories().subscribe({ next: (c) => this.categories.set(c) });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
