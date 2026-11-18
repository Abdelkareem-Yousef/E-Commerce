import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../Services/Cart';
import { AuthService } from '../../Services/auth';
import { WishlistService } from '../../Services/wishlist';
import { MenuCategory, ProductService } from '../../Services/product';


@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  cart = inject(CartService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);
  private router = inject(Router);
  private productService = inject(ProductService);

  /** categories + their subcategories (/category_menu) */
  menu = signal<MenuCategory[]>([]);
  /** category whose menu is open (mouse is over it) */
  openId = signal<string | null>(null);
  openCategory = computed(() => this.menu().find((c) => c._id === this.openId()) ?? null);
  private timer?: ReturnType<typeof setTimeout>;

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
    this.productService.getCategoryMenu().subscribe({ next: (c) => this.menu.set(c) });
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
  }

  // small delays: the menu doesn't flash when the mouse just passes over the bar,
  // and doesn't close while moving from the category name down into the menu
  openMenu(id: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.openId.set(id), this.openId() ? 0 : 120);
  }

  closeMenu() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.openId.set(null), 150);
  }

  cancelClose() {
    clearTimeout(this.timer);
  }

  closeNow() {
    clearTimeout(this.timer);
    this.openId.set(null);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
