import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL } from './auth';

export interface Address {
  _id?: string;
  label: string;
  phone: string;
  city: string;
  area?: string;
  street: string;
  building?: string;
  notes?: string;
  isDefault?: boolean;
}

export const addressLine = (a: Partial<Address>) =>
  [a.street, a.building, a.area, a.city].filter(Boolean).join(', ');

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  gender?: 'male' | 'female';
  role: 'user' | 'admin';
  address: string[];
  addresses?: Address[];
  phone: string;
  image?: { secure_url?: string; public_id?: string };
  createdAt?: string;
}

export interface OrderItem {
  productId: { _id: string; name: string; price: number; image?: { secure_url: string } } | null;
  quantity: number;
  price?: number;
}

export interface Order {
  _id: string;
  products: OrderItem[];
  status: 'pending' | 'completed' | 'canceled';
  address: string;
  shippingAddress?: Partial<Address>;
  phone: string;
  paymentMethod: 'cash' | 'card';
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  paidAt?: string;
  subtotal?: number;
  discount?: number;
  total?: number;
  coupon?: { code: string };
  /** sent with /my_orders: the customer can cancel until this time */
  cancelUntil?: string;
  canCancel?: boolean;
  createdAt: string;
  userId?: { _id: string; name: string; email: string } | null;
}

/** price saved in the order, or the current product price for old orders */
export const orderTotal = (o: Order) =>
  o.total ?? o.products.reduce((s, i) => s + i.quantity * (i.price ?? i.productId?.price ?? 0), 0);

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private url = API_URL;

  getProfile() {
    return this.http.get<{ user_data: UserProfile }>(`${this.url}/Profile`).pipe(map((r) => r.user_data));
  }

  updateProfile(data: { name?: string; phone?: string; address?: string[] }) {
    return this.http
      .patch<{ user_data: UserProfile }>(`${this.url}/Update_profile`, data)
      .pipe(map((r) => r.user_data));
  }

  uploadPicture(file: File) {
    const form = new FormData();
    form.append('image', file);
    return this.http
      .post<{ user_data: UserProfile }>(`${this.url}/Upload_profile`, form)
      .pipe(map((r) => r.user_data));
  }

  // ---------- address book ----------
  getAddresses() {
    return this.http.get<{ addresses: Address[] }>(`${this.url}/addresses`).pipe(map((r) => r.addresses));
  }

  addAddress(a: Address) {
    return this.http
      .post<{ address: Address; addresses: Address[] }>(`${this.url}/addresses`, a);
  }

  updateAddress(id: string, a: Partial<Address>) {
    return this.http.patch<{ addresses: Address[] }>(`${this.url}/addresses/${id}`, a).pipe(map((r) => r.addresses));
  }

  deleteAddress(id: string) {
    return this.http.delete<{ addresses: Address[] }>(`${this.url}/addresses/${id}`).pipe(map((r) => r.addresses));
  }

  cancelOrder(id: string) {
    return this.http.patch<{ order: Order; message: string }>(`${this.url}/my_orders/${id}/cancel`, {}).pipe(map((r) => r.order));
  }

  myOrders() {
    return this.http.get<{ orders: Order[] }>(`${this.url}/my_orders`).pipe(map((r) => r.orders));
  }
}
