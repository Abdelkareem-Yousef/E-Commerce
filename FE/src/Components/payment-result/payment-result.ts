import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CheckoutService } from '../../Services/checkout';
import { Order, UserService, orderTotal } from '../../Services/user';

type State = 'checking' | 'paid' | 'pending' | 'canceled-payment' | 'order-canceled' | 'error';

/** /payment/success?session_id=...  and  /payment/cancel?order=...  (Stripe sends the customer here) */
@Component({
  selector: 'app-payment-result',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './payment-result.html',
  styleUrl: './payment-result.css',
})
export class PaymentResult implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private checkout = inject(CheckoutService);
  private users = inject(UserService);

  state = signal<State>('checking');
  order = signal<Order | null>(null);
  orderId = signal<string>('');
  error = signal('');
  busy = signal(false);
  confirmCancel = signal(false);
  orderTotal = orderTotal;
  private sessionId = '';

  ngOnInit() {
    const mode = this.route.snapshot.data['mode'];
    const q = this.route.snapshot.queryParamMap;
    if (mode === 'success') {
      this.sessionId = q.get('session_id') ?? '';
      this.verify();
    } else {
      this.orderId.set(q.get('order') ?? '');
      this.state.set('canceled-payment');
    }
  }

  sessionIdPresent() {
    return !!this.sessionId;
  }

  short() {
    return (this.order()?._id ?? this.orderId()).slice(-6).toUpperCase();
  }

  verify() {
    if (!this.sessionId) {
      this.state.set('error');
      this.error.set('This payment link is missing information.');
      return;
    }
    this.state.set('checking');
    this.checkout.verifyPayment(this.sessionId).subscribe({
      next: ({ paid, order }) => {
        this.order.set(order);
        this.orderId.set(order._id);
        this.state.set(paid ? 'paid' : 'pending');
      },
      error: (err) => {
        this.state.set('error');
        this.error.set(err.error?.message ?? 'We could not check your payment.');
      },
    });
  }

  /** "Try again": a fresh Stripe page for the same order */
  payAgain() {
    const id = this.orderId();
    if (!id) return;
    this.busy.set(true);
    this.error.set('');
    this.checkout.payOrder(id).subscribe({
      next: (url) => (window.location.href = url),
      error: (err) => {
        this.busy.set(false);
        if (err.error?.alreadyPaid) {
          this.goOrders(); // it was paid after all: show it in My orders
          return;
        }
        this.error.set(err.error?.message ?? 'Could not open the payment page.');
      },
    });
  }

  cancelOrder() {
    const id = this.orderId();
    if (!id) return;
    this.busy.set(true);
    this.error.set('');
    this.users
      .cancelOrder(id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.state.set('order-canceled'),
        error: (err) => {
          this.confirmCancel.set(false);
          this.error.set(err.error?.message ?? 'Could not cancel the order.');
        },
      });
  }

  goOrders() {
    this.router.navigate(['/profile'], { queryParams: { tab: 'orders' } });
  }
}
