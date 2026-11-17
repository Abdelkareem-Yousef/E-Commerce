import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL } from './auth';
import { Order } from './user';
import { Product } from './product';

export interface Coupon {
  _id?: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  maxDiscount?: number | null;
  minOrder?: number | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  usedCount?: number;
  onePerUser?: boolean;
  active?: boolean;
  createdAt?: string;
}

export interface StatsRange {
  from: string; // YYYY-MM-DD
  to: string;
  tz?: string;
  days?: number;
  granularity?: 'day' | 'month';
}

export interface DashboardStats {
  range: StatsRange;
  // follow the chosen range
  revenue: number;
  discounts?: number;
  itemsSold: number;
  ordersInRange: number;
  averageOrder: number;
  newCustomers: number;
  ordersByStatus: { pending: number; completed: number; canceled: number };
  sales: { date: string; revenue: number; orders: number }[];
  topProducts: { _id: string; name: string; sold: number; revenue: number }[];
  recentOrders: Order[];
  // all time
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  lowStock: Pick<Product, '_id' | 'name' | 'stock' | 'price' | 'image'>[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private url = `${API_URL}/admin`;

  /** from / to: YYYY-MM-DD (both days included), read in the browser's time zone */
  stats(from?: string, to?: string) {
    const params: Record<string, string> = { tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo' };
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<{ stats: DashboardStats }>(`${this.url}/stats`, { params }).pipe(map((r) => r.stats));
  }

  orders() {
    return this.http.get<{ orders: Order[] }>(`${this.url}/orders`).pipe(map((r) => r.orders));
  }

  setOrderStatus(id: string, status: Order['status']) {
    return this.http.patch<{ order: Order }>(`${this.url}/orders/${id}`, { status }).pipe(map((r) => r.order));
  }

  // ---------- coupons ----------
  coupons() {
    return this.http.get<{ coupons: Coupon[] }>(`${this.url}/coupons`).pipe(map((r) => r.coupons));
  }

  addCoupon(c: Coupon) {
    return this.http.post<{ coupon: Coupon }>(`${this.url}/coupons`, c).pipe(map((r) => r.coupon));
  }

  updateCoupon(id: string, c: Partial<Coupon>) {
    return this.http.patch<{ coupon: Coupon }>(`${this.url}/coupons/${id}`, c).pipe(map((r) => r.coupon));
  }

  deleteCoupon(id: string) {
    return this.http.delete<{ message: string }>(`${this.url}/coupons/${id}`);
  }
}
