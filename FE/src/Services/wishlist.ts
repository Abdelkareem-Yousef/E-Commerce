import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { API_URL } from './auth';
import { Product } from './product';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private url = API_URL;

  items = signal<Product[]>([]);
  count = computed(() => this.items().length);
  private ids = computed(() => new Set(this.items().map((p) => p._id)));

  has(productId: string): boolean {
    return this.ids().has(productId);
  }

  load() {
    return this.http
      .get<{ wishlist: Product[] }>(`${this.url}/get_wishlist`)
      .pipe(tap((res) => this.items.set(res.wishlist ?? [])));
  }

  add(productId: string) {
    return this.http.post(`${this.url}/add_to_wishlist`, { productId }).pipe(switchMap(() => this.load()));
  }

  remove(productId: string) {
    return this.http
      .delete(`${this.url}/remove_from_wishlist`, { body: { productId } })
      .pipe(switchMap(() => this.load()));
  }

  toggle(productId: string): Observable<unknown> {
    return this.has(productId) ? this.remove(productId) : this.add(productId);
  }

  reset() {
    this.items.set([]);
  }
}
