import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, tap } from 'rxjs';
import { API_URL } from './auth';

export interface CartProduct {
  _id: string;
  name: string;
  price: number;
  image?: { secure_url: string };
  stock: number;
}
export interface CartItem { productId: CartProduct; quantity: number; }

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private url = API_URL;

  items = signal<CartItem[]>([]);
  count = computed(() => this.items().reduce((n, i) => n + i.quantity, 0));
  total = computed(() => this.items().reduce((s, i) => s + i.productId.price * i.quantity, 0));

  load() {
    return this.http
      .get<{ cart: { products: CartItem[] } | null }>(`${this.url}/get_cart`)
      .pipe(tap((res) => this.items.set((res.cart?.products ?? []).filter((p) => p.productId))));
  }

  /** quantity: +1 to increase, -1 to decrease */
  add(productId: string, quantity = 1) {
    return this.http.post(`${this.url}/add_to_cart`, { productId, quantity })
      .pipe(switchMap(() => this.load()));
  }

  remove(productId: string) {
    return this.http.delete(`${this.url}/delete_from_cart`, { body: { productId } })
      .pipe(switchMap(() => this.load()));
  }

  clear() {
    return this.http.delete(`${this.url}/clear_cart`).pipe(switchMap(() => this.load()));
  }

  reset() { this.items.set([]); }
}