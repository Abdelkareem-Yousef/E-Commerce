import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL } from './auth';
import { Address, Order } from './user';

export interface CouponResult {
  coupon: { code: string; type: 'percent' | 'fixed'; value: number };
  subtotal: number;
  discount: number;
  total: number;
}

export interface PlaceOrderPayload {
  addressId?: string;
  address?: Address;
  saveAddress?: boolean;
  paymentMethod: 'cash' | 'card';
  couponCode?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private http = inject(HttpClient);
  private url = API_URL;

  applyCoupon(code: string) {
    return this.http.post<CouponResult>(`${this.url}/apply_coupon`, { code });
  }

  /** card orders come back with checkoutUrl: the Stripe page to send the customer to */
  placeOrder(data: PlaceOrderPayload) {
    return this.http.post<{ order: Order; checkoutUrl: string | null }>(`${this.url}/make_order`, data);
  }

  /** a new Stripe page for an unpaid card order ("Pay now" / "Try again") */
  payOrder(orderId: string) {
    return this.http
      .post<{ checkoutUrl: string }>(`${this.url}/payment/checkout/${orderId}`, {})
      .pipe(map((r) => r.checkoutUrl));
  }

  /** after Stripe sends the customer back: ask the server if it was paid */
  verifyPayment(sessionId: string) {
    return this.http.get<{ paid: boolean; order: Order }>(`${this.url}/payment/verify`, { params: { session_id: sessionId } });
  }
}
