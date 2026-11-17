import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService, Coupon } from '../../../Services/admin';

interface CouponForm {
  code: string;
  type: 'percent' | 'fixed';
  value: number | null;
  maxDiscount: number | null;
  minOrder: number | null;
  expiresAt: string; // yyyy-mm-dd from <input type="date">
  usageLimit: number | null;
  onePerUser: boolean;
  active: boolean;
}

const empty = (): CouponForm => ({
  code: '',
  type: 'percent',
  value: null,
  maxDiscount: null,
  minOrder: null,
  expiresAt: '',
  usageLimit: null,
  onePerUser: true,
  active: true,
});

@Component({
  selector: 'app-admin-coupons',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './coupons.html',
  styleUrl: './coupons.css',
})
export class AdminCoupons implements OnInit {
  private admin = inject(AdminService);

  coupons = signal<Coupon[]>([]);
  loading = signal(true);
  loadError = signal('');

  /** null = closed, 'new' = create, or the id being edited */
  formMode = signal<string | null>(null);
  form: CouponForm = empty();
  saving = signal(false);
  formError = signal('');

  togglingId = signal<string | null>(null);
  confirmDeleteId = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  today = new Date().toISOString().slice(0, 10);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.admin
      .coupons()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (c) => this.coupons.set(c),
        error: (err) => this.loadError.set(err.error?.message ?? 'Could not load coupons.'),
      });
  }

  // ---------- status helpers ----------
  isExpired(c: Coupon) {
    return !!c.expiresAt && new Date(c.expiresAt) < new Date();
  }
  isUsedUp(c: Coupon) {
    return !!c.usageLimit && (c.usedCount ?? 0) >= c.usageLimit;
  }
  state(c: Coupon): { label: string; cls: string; icon: string } {
    if (!c.active) return { label: 'Off', cls: 'off', icon: 'bi-pause-circle' };
    if (this.isExpired(c)) return { label: 'Expired', cls: 'expired', icon: 'bi-clock-history' };
    if (this.isUsedUp(c)) return { label: 'Used up', cls: 'expired', icon: 'bi-slash-circle' };
    return { label: 'Active', cls: 'active', icon: 'bi-check-circle' };
  }

  // ---------- form ----------
  openNew() {
    this.form = empty();
    this.formError.set('');
    this.formMode.set('new');
  }

  openEdit(c: Coupon) {
    this.form = {
      code: c.code,
      type: c.type,
      value: c.value,
      maxDiscount: c.maxDiscount ?? null,
      minOrder: c.minOrder ?? null,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      usageLimit: c.usageLimit ?? null,
      onePerUser: c.onePerUser ?? true,
      active: c.active ?? true,
    };
    this.formError.set('');
    this.formMode.set(c._id!);
  }

  randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.form.code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  save(f: NgForm) {
    if (f.invalid) {
      f.control.markAllAsTouched();
      return;
    }
    if (this.form.type === 'percent' && (this.form.value ?? 0) > 100) {
      this.formError.set('A percent coupon can be at most 100%.');
      return;
    }
    const body: Coupon = {
      code: this.form.code.trim().toUpperCase(),
      type: this.form.type,
      value: Number(this.form.value),
      maxDiscount: this.form.type === 'percent' && this.form.maxDiscount ? Number(this.form.maxDiscount) : null,
      minOrder: this.form.minOrder ? Number(this.form.minOrder) : 0,
      // end of the chosen day
      expiresAt: this.form.expiresAt ? new Date(this.form.expiresAt + 'T23:59:59').toISOString() : null,
      usageLimit: this.form.usageLimit ? Number(this.form.usageLimit) : null,
      onePerUser: this.form.onePerUser,
      active: this.form.active,
    };

    const mode = this.formMode();
    this.saving.set(true);
    this.formError.set('');
    const req$ = mode === 'new' ? this.admin.addCoupon(body) : this.admin.updateCoupon(mode!, body);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        if (mode === 'new') this.coupons.update((l) => [saved, ...l]);
        else this.coupons.update((l) => l.map((c) => (c._id === saved._id ? saved : c)));
        this.flash('success', `Coupon ${saved.code} ${mode === 'new' ? 'created' : 'updated'}.`);
        this.formMode.set(null);
      },
      error: (err) => this.formError.set(err.error?.message ?? 'Could not save the coupon.'),
    });
  }

  // ---------- row actions ----------
  toggleActive(c: Coupon) {
    this.togglingId.set(c._id!);
    this.admin
      .updateCoupon(c._id!, { active: !c.active })
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: (saved) => this.coupons.update((l) => l.map((x) => (x._id === saved._id ? saved : x))),
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not update the coupon.'),
      });
  }

  doDelete(c: Coupon) {
    this.deletingId.set(c._id!);
    this.admin
      .deleteCoupon(c._id!)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.coupons.update((l) => l.filter((x) => x._id !== c._id));
          this.confirmDeleteId.set(null);
          this.flash('success', `Coupon ${c.code} deleted.`);
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not delete the coupon.'),
      });
  }

  copy(code: string) {
    navigator.clipboard?.writeText(code).then(() => this.flash('success', `Copied ${code}.`));
  }

  private flash(type: 'success' | 'danger', text: string) {
    this.messageType.set(type);
    this.message.set(text);
  }
}
