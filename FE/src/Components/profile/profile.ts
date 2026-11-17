import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { AuthService } from '../../Services/auth';
import { Address, Order, UserProfile, UserService, addressLine, orderTotal } from '../../Services/user';
import { AddressForm, AddressFormResult } from '../shared/address-form/address-form';
import { CheckoutService } from '../../Services/checkout';

type Tab = 'info' | 'addresses' | 'orders';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe, AddressForm],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, OnDestroy {
  private users = inject(UserService);
  private route = inject(ActivatedRoute);
  private checkout = inject(CheckoutService);
  payingId = signal<string | null>(null);
  auth = inject(AuthService);

  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  loadError = signal('');
  tab = signal<Tab>('info');

  // edit info
  editing = signal(false);
  saving = signal(false);
  form = { name: '', phone: '' };
  phonePattern = /^\+?[0-9]{8,15}$/;

  // picture
  uploading = signal(false);

  // reset password (sends an email with a link)
  sendingReset = signal(false);

  // address book
  addresses = signal<Address[]>([]);
  /** null = list, 'new' = add form, or the id being edited */
  addrMode = signal<string | null>(null);
  addrBusy = signal(false);
  confirmDeleteAddr = signal<string | null>(null);
  addressLine = addressLine;

  // orders
  orders = signal<Order[] | null>(null);
  ordersLoading = signal(false);
  orderTotal = orderTotal;
  /** ticks every 30s so the "time left to cancel" stays correct */
  now = signal(Date.now());
  private timer = setInterval(() => this.now.set(Date.now()), 30_000);
  confirmCancelId = signal<string | null>(null);
  cancelingId = signal<string | null>(null);

  // one message area for the whole page
  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  initials = computed(() =>
    (this.profile()?.name ?? '?')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  );

  ngOnInit() {
    this.users
      .getProfile()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => {
          this.profile.set(p);
          this.addresses.set(p.addresses ?? []);
          // e.g. /profile?tab=orders (link from the checkout page)
          const t = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
          if (t && (t !== 'info' && p.role === 'user')) this.selectTab(t);
        },
        error: (err) => this.loadError.set(err.error?.message ?? 'Could not load your profile.'),
      });
  }

  selectTab(t: Tab) {
    this.tab.set(t);
    this.message.set('');
    if (t === 'orders' && this.orders() === null) this.loadOrders();
  }

  startEdit() {
    const p = this.profile();
    if (!p) return;
    this.form = { name: p.name, phone: p.phone ?? '' };
    this.editing.set(true);
    this.message.set('');
  }

  saveInfo(f: NgForm) {
    if (f.invalid) {
      f.control.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.users
      .updateProfile({
        name: this.form.name.trim(),
        phone: this.form.phone.trim(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (p) => {
          this.profile.set(p);
          this.auth.updateUser({ name: p.name }); // navbar shows the new name
          this.editing.set(false);
          this.flash('success', 'Profile updated.');
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not update profile.'),
      });
  }

  onPicture(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.flash('danger', 'Please choose an image file.');
      return;
    }
    this.uploading.set(true);
    this.users
      .uploadPicture(file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (p) => {
          this.profile.set(p);
          this.flash('success', 'Profile picture updated.');
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not upload picture.'),
      });
  }

  sendResetLink() {
    const email = this.profile()?.email;
    if (!email) return;
    this.sendingReset.set(true);
    this.auth
      .forgotPassword(email)
      .pipe(finalize(() => this.sendingReset.set(false)))
      .subscribe({
        next: () => this.flash('success', `We sent a reset link to ${email}. It works for 1 hour.`),
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not send the reset email.'),
      });
  }

  // ---------- address book ----------
  editingAddress(): Address | null {
    const m = this.addrMode();
    return this.addresses().find((a) => a._id === m) ?? null;
  }

  saveAddress(r: AddressFormResult) {
    const mode = this.addrMode();
    const body = { ...r.address, isDefault: r.save };
    this.addrBusy.set(true);
    const req$: Observable<unknown> =
      mode === 'new'
        ? this.users.addAddress(body)
        : this.users.updateAddress(mode!, r.save ? body : r.address);
    req$.pipe(finalize(() => this.addrBusy.set(false))).subscribe({
      next: (res: any) => {
        this.addresses.set(Array.isArray(res) ? res : res.addresses);
        this.addrMode.set(null);
        this.flash('success', mode === 'new' ? 'Address added.' : 'Address updated.');
      },
      error: (err) => this.flash('danger', err.error?.message ?? 'Could not save the address.'),
    });
  }

  makeDefault(a: Address) {
    this.users.updateAddress(a._id!, { isDefault: true }).subscribe({
      next: (list) => this.addresses.set(list),
      error: (err) => this.flash('danger', err.error?.message ?? 'Could not update the address.'),
    });
  }

  deleteAddress(a: Address) {
    this.addrBusy.set(true);
    this.users
      .deleteAddress(a._id!)
      .pipe(finalize(() => this.addrBusy.set(false)))
      .subscribe({
        next: (list) => {
          this.addresses.set(list);
          this.confirmDeleteAddr.set(null);
          this.flash('success', 'Address deleted.');
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not delete the address.'),
      });
  }

  defaultAddress() {
    return this.addresses().find((a) => a.isDefault) ?? this.addresses()[0] ?? null;
  }

  loadOrders() {
    this.ordersLoading.set(true);
    this.users
      .myOrders()
      .pipe(finalize(() => this.ordersLoading.set(false)))
      .subscribe({
        next: (o) => this.orders.set(o),
        error: () => {
          this.orders.set([]);
          this.flash('danger', 'Could not load your orders.');
        },
      });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  // ---------- cancel order (within 5 hours) ----------
  canCancel(o: Order) {
    return o.status === 'pending' && !!o.cancelUntil && new Date(o.cancelUntil).getTime() > this.now();
  }

  timeLeft(o: Order) {
    const ms = new Date(o.cancelUntil ?? 0).getTime() - this.now();
    const mins = Math.max(0, Math.ceil(ms / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  cancelOrder(o: Order) {
    this.cancelingId.set(o._id);
    this.users
      .cancelOrder(o._id)
      .pipe(finalize(() => this.cancelingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.orders.update((list) => (list ?? []).map((x) => (x._id === o._id ? updated : x)));
          this.confirmCancelId.set(null);
          this.flash('success', `Order #${o._id.slice(-6).toUpperCase()} was canceled.`);
        },
        error: (err) => {
          this.confirmCancelId.set(null);
          this.flash('danger', err.error?.message ?? 'Could not cancel the order.');
          this.loadOrders(); // refresh: it may have been processed or the time ran out
        },
      });
  }

  // ---------- unpaid card order -> Stripe ----------
  needsPayment(o: Order) {
    return o.paymentMethod === 'card' && o.paymentStatus === 'unpaid' && o.status === 'pending';
  }

  payNow(o: Order) {
    this.payingId.set(o._id);
    this.checkout.payOrder(o._id).subscribe({
      next: (url) => (window.location.href = url),
      error: (err) => {
        this.payingId.set(null);
        if (err.error?.alreadyPaid) {
          // the earlier payment went through: nothing to pay, just show it as paid
          this.flash('success', 'Good news: this order is already paid.');
        } else {
          this.flash('danger', err.error?.message ?? 'Could not open the payment page.');
        }
        this.loadOrders();
      },
    });
  }

  paymentLabel(o: Order) {
    return { paid: 'Paid', refunded: 'Refunded', unpaid: 'Unpaid' }[o.paymentStatus ?? 'unpaid'];
  }

  statusClass(status: string) {
    return { pending: 'text-bg-warning', completed: 'text-bg-success', canceled: 'text-bg-secondary' }[status] ?? 'text-bg-light';
  }

  private flash(type: 'success' | 'danger', text: string) {
    this.messageType.set(type);
    this.message.set(text);
  }
}
