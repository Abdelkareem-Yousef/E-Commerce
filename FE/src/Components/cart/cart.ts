import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { CartItem, CartProduct, CartService } from '../../Services/Cart';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit {
  cart = inject(CartService);

  isLoading = signal(true);
  busy = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    this.cart.load()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({ error: () => this.errorMessage.set('Could not load your cart.') });
  }

  image(p: CartProduct): string | null {
  return p.image?.secure_url ?? null;
  }

  private run(request$: Observable<unknown>, fallback: string) {
    this.busy.set(true);
    this.errorMessage.set('');
    request$.pipe(finalize(() => this.busy.set(false))).subscribe({
      error: (err) => this.errorMessage.set(err.error?.message ?? fallback),
    });
  }

  changeQty(item: CartItem, delta: 1 | -1) {
    this.run(this.cart.add(item.productId._id, delta), 'Could not update quantity.');
  }
  remove(item: CartItem) {
    this.run(this.cart.remove(item.productId._id), 'Could not remove item.');
  }
  clear() {
    this.run(this.cart.clear(), 'Could not clear the cart.');
  }
}