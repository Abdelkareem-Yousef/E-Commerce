import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { WishlistService } from '../../Services/wishlist';
import { CartService } from '../../Services/Cart';
import { Product } from '../../Services/product';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css',
})
export class Wishlist implements OnInit {
  wishlist = inject(WishlistService);
  private cart = inject(CartService);

  loading = signal(true);
  busyId = signal<string | null>(null);
  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  ngOnInit() {
    this.wishlist
      .load()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ error: () => this.flash('danger', 'Could not load your wishlist.') });
  }

  remove(p: Product) {
    this.busyId.set(p._id);
    this.wishlist
      .remove(p._id)
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({ error: (err) => this.flash('danger', err.error?.message ?? 'Could not remove item.') });
  }

  moveToCart(p: Product) {
    this.busyId.set(p._id);
    this.cart
      .add(p._id, 1)
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: () => {
          this.flash('success', `${p.name} added to cart.`);
          this.wishlist.remove(p._id).subscribe();
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not add to cart.'),
      });
  }

  private flash(type: 'success' | 'danger', text: string) {
    this.messageType.set(type);
    this.message.set(text);
  }
}
