import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../../Services/admin';
import { Order, orderTotal } from '../../../Services/user';

type Filter = 'all' | Order['status'];
type DatePreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom';

/** YYYY-MM-DD in the browser's local time */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class AdminOrders implements OnInit {
  private admin = inject(AdminService);

  orders = signal<Order[]>([]);
  loading = signal(true);
  loadError = signal('');
  filter = signal<Filter>('all');
  search = signal('');
  openId = signal<string | null>(null);
  savingId = signal<string | null>(null);
  /** order waiting for "yes, cancel it" */
  confirmCancelId = signal<string | null>(null);
  message = signal('');
  messageType = signal<'success' | 'danger'>('success');
  orderTotal = orderTotal;

  // ---------- date filter ----------
  datePresets: { key: DatePreset; label: string }[] = [
    { key: 'all', label: 'All time' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: 'month', label: 'This month' },
  ];
  datePreset = signal<DatePreset>('all');
  /** applied range (YYYY-MM-DD, both days included); empty = no limit */
  range = signal<{ from: string; to: string }>({ from: '', to: '' });
  // inputs (applied with the Apply button)
  fromInput = '';
  toInput = '';
  todayStr = ymd(new Date());

  /** orders inside the chosen dates (status tabs and search work on top of this) */
  inDates = computed(() => {
    const { from, to } = this.range();
    if (!from && !to) return this.orders();
    return this.orders().filter((o) => {
      const day = ymd(new Date(o.createdAt));
      return (!from || day >= from) && (!to || day <= to);
    });
  });

  /** money from the orders in the dates, canceled ones not counted */
  rangeRevenue = computed(() =>
    this.inDates().filter((o) => o.status !== 'canceled').reduce((s, o) => s + orderTotal(o), 0)
  );

  rangeLabel = computed(() => {
    const { from, to } = this.range();
    const fmt = (v: string) => new Date(v + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!from && !to) return 'All time';
    if (from === to) return fmt(from);
    return `${from ? fmt(from) : 'Start'} – ${to ? fmt(to) : 'Today'}`;
  });

  counts = computed(() => {
    const c = { all: 0, pending: 0, completed: 0, canceled: 0 };
    for (const o of this.inDates()) {
      c.all++;
      c[o.status]++;
    }
    return c;
  });

  filtered = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    return this.inDates().filter((o) => {
      if (f !== 'all' && o.status !== f) return false;
      if (!q) return true;
      return (
        o._id.toLowerCase().includes(q) ||
        (o.userId?.name ?? '').toLowerCase().includes(q) ||
        (o.userId?.email ?? '').toLowerCase().includes(q) ||
        (o.phone ?? '').includes(q)
      );
    });
  });

  tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'canceled', label: 'Canceled' },
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    this.admin
      .orders()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (o) => this.orders.set(o),
        error: (err) => this.loadError.set(err.error?.message ?? 'Could not load orders.'),
      });
  }

  chooseDate(p: DatePreset) {
    const today = new Date();
    const to = ymd(today);
    const from =
      p === 'today' ? to :
      p === '7d' ? ymd(addDays(today, -6)) :
      p === '30d' ? ymd(addDays(today, -29)) :
      p === 'month' ? ymd(new Date(today.getFullYear(), today.getMonth(), 1)) : '';
    this.datePreset.set(p);
    this.range.set(p === 'all' ? { from: '', to: '' } : { from, to });
    this.fromInput = this.range().from;
    this.toInput = this.range().to;
  }

  applyDates() {
    let from = this.fromInput;
    let to = this.toInput;
    if (from && to && from > to) [from, to] = [to, from];
    this.fromInput = from;
    this.toInput = to;
    this.range.set({ from, to });
    this.datePreset.set(from || to ? 'custom' : 'all');
  }

  toggle(o: Order) {
    this.openId.set(this.openId() === o._id ? null : o._id);
  }

  setStatus(o: Order, status: Order['status']) {
    if (status === o.status) return;
    if (status === 'canceled' && this.confirmCancelId() !== o._id) {
      this.confirmCancelId.set(o._id); // ask first: cancel puts items back in stock and can't be undone
      return;
    }
    this.confirmCancelId.set(null);
    this.savingId.set(o._id);
    this.admin
      .setOrderStatus(o._id, status)
      .pipe(finalize(() => this.savingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.orders.update((list) =>
            list.map((x) => (x._id === o._id ? { ...x, status: updated.status, paymentStatus: updated.paymentStatus } : x))
          );
          this.flash('success', `Order #${this.short(o)} is now ${status}.`);
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not update the order.'),
      });
  }

  short(o: Order) {
    return o._id.slice(-6).toUpperCase();
  }

  itemCount(o: Order) {
    return o.products.reduce((n, i) => n + i.quantity, 0);
  }

  private flash(type: 'success' | 'danger', text: string) {
    this.messageType.set(type);
    this.message.set(text);
  }
}
