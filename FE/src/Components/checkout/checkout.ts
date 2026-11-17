import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CartService } from '../../Services/Cart';
import { CheckoutService, CouponResult } from '../../Services/checkout';
import { Address, Order, UserService, addressLine } from '../../Services/user';
import { AddressForm, AddressFormResult } from '../shared/address-form/address-form';

type Pay = 'cash' | 'card';

@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, FormsModule, RouterLink, AddressForm],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  cart = inject(CartService);
  private users = inject(UserService);
  private checkout = inject(CheckoutService);

  loading = signal(true);
  addresses = signal<Address[]>([]);
  /** id of a saved address, or 'new' for a one-time address */
  selected = signal<string | null>(null);
  oneTime = signal<Address | null>(null);
  showForm = signal(false);
  savingAddress = signal(false);

  payment = signal<Pay>('cash');

  couponCode = '';
  coupon = signal<CouponResult | null>(null);
  applying = signal(false);
  couponError = signal('');

  placing = signal(false);
  error = signal('');
  placed = signal<Order | null>(null);
  /** card: we're sending the customer to Stripe */
  redirecting = signal(false);

  addressLine = addressLine;

  subtotal = computed(() => this.cart.total());
  discount = computed(() => this.coupon()?.discount ?? 0);
  total = computed(() => Math.max(0, this.subtotal() - this.discount()));
  canPlace = computed(() => !!this.selected() && this.cart.items().length > 0 && !this.placing());

  ngOnInit() {
    this.cart.load().subscribe();
    this.users
      .getAddresses()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (list) => {
          this.addresses.set(list);
          const def = list.find((a) => a.isDefault) ?? list[0];
          if (def?._id) this.selected.set(def._id);
          else this.showForm.set(true); // no saved address yet -> open the form
        },
        error: () => this.showForm.set(true),
      });
  }

  // ---------- address ----------
  onNewAddress(r: AddressFormResult) {
    if (!r.save) {
      // use it for this order only
      this.oneTime.set(r.address);
      this.selected.set('new');
      this.showForm.set(false);
      return;
    }
    this.savingAddress.set(true);
    this.users
      .addAddress(r.address)
      .pipe(finalize(() => this.savingAddress.set(false)))
      .subscribe({
        next: (res) => {
          this.addresses.set(res.addresses);
          this.selected.set(res.address._id ?? null);
          this.showForm.set(false);
        },
        error: (err) => this.error.set(err.error?.message ?? 'Could not save the address.'),
      });
  }

  // ---------- coupon ----------
  applyCoupon() {
    const code = this.couponCode.trim();
    if (!code) return;
    this.applying.set(true);
    this.couponError.set('');
    this.checkout
      .applyCoupon(code)
      .pipe(finalize(() => this.applying.set(false)))
      .subscribe({
        next: (res) => this.coupon.set(res),
        error: (err) => {
          this.coupon.set(null);
          this.couponError.set(err.error?.message ?? 'This coupon is not valid.');
        },
      });
  }

  removeCoupon() {
    this.coupon.set(null);
    this.couponCode = '';
    this.couponError.set('');
  }

  // ---------- place order ----------
  placeOrder() {
    const sel = this.selected();
    if (!sel) {
      this.error.set('Choose a delivery address.');
      return;
    }
    this.placing.set(true);
    this.error.set('');
    this.checkout
      .placeOrder({
        ...(sel === 'new' ? { address: this.oneTime()! } : { addressId: sel }),
        paymentMethod: this.payment(),
        couponCode: this.coupon()?.coupon.code,
      })
      .pipe(finalize(() => this.placing.set(false)))
      .subscribe({
        next: ({ order, checkoutUrl }) => {
          this.cart.reset();
          if (checkoutUrl) {
            // card: continue on Stripe's secure page, it sends the customer back to /payment/success
            this.redirecting.set(true);
            window.location.href = checkoutUrl;
            return;
          }
          this.placed.set(order);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          this.error.set(err.error?.message ?? 'Could not place your order.');
          // coupon may have become invalid (used / expired) -> drop it so they can retry
          if (/coupon/i.test(err.error?.message ?? '')) this.coupon.set(null);
          this.cart.load().subscribe();
        },
      });
  }
}
