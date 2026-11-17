import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../Services/auth';
import { Product, ProductService, brandName, productPictures } from '../../../Services/product';
import { CartService } from '../../../Services/Cart';
import { WishlistService } from '../../../Services/wishlist';

@Component({
  selector: 'app-product-details',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private products = inject(ProductService);
  private cart = inject(CartService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);

  product = signal<Product | null>(null);
  error = signal(false);
  adding = signal(false);
  togglingWish = signal(false);
  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  // gallery
  pictures = computed(() => (this.product() ? productPictures(this.product()!) : []));
  active = signal(0);
  zoom = signal(false);
  private touchX = 0;

  // options (shown so the customer knows what exists; the cart stores the product only)
  selectedSize = signal<string | null>(null);
  selectedColor = signal<string | null>(null);
  qty = signal(1);

  brand = computed(() => (this.product() ? brandName(this.product()!) : ''));
  maxQty = computed(() => Math.max(1, Math.min(10, this.product()?.stock ?? 1)));
  inCart = computed(() => {
    const id = this.product()?._id;
    return this.cart.items().find((i) => i.productId._id === id)?.quantity ?? 0;
  });

  ngOnInit() {
    // re-load when you open another product from this page
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error.set(true);
        return;
      }
      this.product.set(null);
      this.error.set(false);
      this.active.set(0);
      this.qty.set(1);
      this.message.set('');
      this.products.getOne(id).subscribe({
        next: (p) => {
          this.product.set(p);
          this.selectedSize.set(p.size?.[0] ?? null);
          this.selectedColor.set(p.color?.[0] ?? null);
        },
        error: () => this.error.set(true),
      });
    });
  }

  // ---------- slider ----------
  go(i: number) {
    const n = this.pictures().length;
    if (!n) return;
    this.active.set((i + n) % n);
  }
  next() {
    this.go(this.active() + 1);
  }
  prev() {
    this.go(this.active() - 1);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'ArrowLeft') this.prev();
    if (e.key === 'Escape') this.zoom.set(false);
  }

  touchStart(e: TouchEvent) {
    this.touchX = e.touches[0].clientX;
  }
  touchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - this.touchX;
    if (Math.abs(dx) > 40) (dx < 0 ? this.next() : this.prev());
  }

  // ---------- buying ----------
  changeQty(delta: number) {
    this.qty.set(Math.min(this.maxQty(), Math.max(1, this.qty() + delta)));
  }

  addToCart(productId: string) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.adding.set(true);
    this.message.set('');

    this.cart.add(productId, this.qty()).subscribe({
      next: () => {
        this.adding.set(false);
        this.messageType.set('success');
        this.message.set('Added to cart');
      },
      error: (err) => {
        this.adding.set(false);
        this.messageType.set('danger');
        this.message.set(err.error?.message ?? 'Could not add to cart.');
      },
    });
  }

  toggleWishlist(productId: string) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const adding = !this.wishlist.has(productId);
    this.togglingWish.set(true);
    this.wishlist.toggle(productId).subscribe({
      next: () => {
        this.togglingWish.set(false);
        this.messageType.set('success');
        this.message.set(adding ? 'Saved to your wishlist' : 'Removed from your wishlist');
      },
      error: (err) => {
        this.togglingWish.set(false);
        this.messageType.set('danger');
        this.message.set(err.error?.message ?? 'Could not update wishlist.');
      },
    });
  }
}
