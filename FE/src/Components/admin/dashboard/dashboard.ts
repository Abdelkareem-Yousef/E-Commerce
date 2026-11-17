import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminService, DashboardStats } from '../../../Services/admin';
import { orderTotal } from '../../../Services/user';

type Preset = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';

/** YYYY-MM-DD in the browser's local time */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  path: string;
  label: string;
  revenue: number;
  orders: number;
  date: string;
  showLabel: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private admin = inject(AdminService);

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal('');
  hovered = signal<Bar | null>(null);
  showTable = signal(false);

  // ---------- date filter ----------
  presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: 'month', label: 'This month' },
    { key: 'year', label: 'This year' },
  ];
  preset = signal<Preset>('7d');
  from = ymd(addDays(new Date(), -6));
  to = ymd(new Date());
  todayStr = ymd(new Date());
  rangeError = signal('');
  byMonth = computed(() => this.stats()?.range?.granularity === 'month');
  orderTotal = orderTotal;

  // chart size (SVG units; it scales to the card width)
  readonly W = 640;
  readonly H = 240;
  readonly pad = { top: 16, right: 12, bottom: 28, left: 56 };

  /** nice rounded max for the y axis + 4 gridlines */
  private yMax = computed(() => {
    const max = Math.max(0, ...(this.stats()?.sales ?? []).map((d) => d.revenue));
    if (max === 0) return 100;
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / step) * step;
  });

  ticks = computed(() => {
    const max = this.yMax();
    const innerH = this.H - this.pad.top - this.pad.bottom;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      value: max * f,
      y: this.pad.top + innerH * (1 - f),
    }));
  });

  bars = computed<Bar[]>(() => {
    const days = this.stats()?.sales ?? [];
    if (!days.length) return [];
    const innerW = this.W - this.pad.left - this.pad.right;
    const innerH = this.H - this.pad.top - this.pad.bottom;
    const slot = innerW / days.length;
    const w = Math.max(2, Math.min(36, slot * 0.6));
    const every = Math.ceil(days.length / 10); // at most ~10 labels so they never overlap
    const base = this.pad.top + innerH;
    return days.map((d, i) => {
      const h = (d.revenue / this.yMax()) * innerH;
      const x = this.pad.left + slot * i + (slot - w) / 2;
      const y = base - h;
      const r = Math.min(4, h, w / 2); // 4px rounded top, flat on the baseline
      const path =
        h <= 0
          ? ''
          : `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
      const label = this.shortLabel(d.date, days.length);
      const showLabel = i % every === 0 || i === days.length - 1;
      return { x, y, w, h, path, label, revenue: d.revenue, orders: d.orders, date: d.date, showLabel };
    });
  });

  baseline = computed(() => this.H - this.pad.bottom);

  /** extra hover area around each bar, up to the middle of the gap */
  hitPad = computed(() => {
    const n = this.bars().length || 1;
    const slot = (this.W - this.pad.left - this.pad.right) / n;
    const w = this.bars()[0]?.w ?? 0;
    return Math.max(0, (slot - w) / 2);
  });

  rangeRevenue = computed(() => this.stats()?.revenue ?? 0);
  rangeOrders = computed(() => (this.stats()?.sales ?? []).reduce((s, d) => s + d.orders, 0));

  /** "Nov 1 – Nov 17, 2026" */
  rangeLabel = computed(() => {
    const r = this.stats()?.range;
    if (!r) return '';
    const f = new Date(r.from + 'T00:00:00');
    const t = new Date(r.to + 'T00:00:00');
    const sameYear = f.getFullYear() === t.getFullYear();
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (r.from === r.to) return t.toLocaleDateString(undefined, { ...opt, year: 'numeric' });
    return `${f.toLocaleDateString(undefined, sameYear ? opt : { ...opt, year: 'numeric' })} – ${t.toLocaleDateString(undefined, { ...opt, year: 'numeric' })}`;
  });

  statusRows = computed(() => {
    const s = this.stats()?.ordersByStatus;
    if (!s) return [];
    const total = s.pending + s.completed + s.canceled || 1;
    return [
      { key: 'completed', label: 'Completed', icon: 'bi-check-circle', count: s.completed, pct: (s.completed / total) * 100, cls: 'bg-success' },
      { key: 'pending', label: 'Pending', icon: 'bi-hourglass-split', count: s.pending, pct: (s.pending / total) * 100, cls: 'bg-warning' },
      { key: 'canceled', label: 'Canceled', icon: 'bi-x-circle', count: s.canceled, pct: (s.canceled / total) * 100, cls: 'bg-secondary' },
    ];
  });

  ngOnInit() {
    this.load();
  }

  choosePreset(p: Preset) {
    const today = new Date();
    this.preset.set(p);
    this.rangeError.set('');
    if (p === 'today') this.from = ymd(today);
    if (p === '7d') this.from = ymd(addDays(today, -6));
    if (p === '30d') this.from = ymd(addDays(today, -29));
    if (p === 'month') this.from = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
    if (p === 'year') this.from = ymd(new Date(today.getFullYear(), 0, 1));
    this.to = ymd(today);
    this.load();
  }

  applyCustom() {
    if (!this.from || !this.to) {
      this.rangeError.set('Choose both dates.');
      return;
    }
    if (this.from > this.to) [this.from, this.to] = [this.to, this.from];
    this.preset.set('custom');
    this.rangeError.set('');
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.hovered.set(null);
    this.admin
      .stats(this.from, this.to)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (s) => this.stats.set(s),
        error: (err) => this.error.set(err.error?.message ?? 'Could not load dashboard data.'),
      });
  }

  /** axis label: weekday for a week, "Nov 3" for longer, "Nov 26" for months */
  private shortLabel(key: string, count: number) {
    if (key.length === 7) {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }
    const d = new Date(key + 'T00:00:00');
    return count <= 7
      ? d.toLocaleDateString(undefined, { weekday: 'short' })
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /** tooltip / table date */
  longLabel(key: string) {
    if (key.length === 7) {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    return new Date(key + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  /** tooltip vertical position in % (kept inside the chart for tiny bars) */
  tipTop(b: Bar) {
    return (Math.max(b.y, this.pad.top + 20) / this.H) * 100;
  }

  shortMoney(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
    return `$${Math.round(v)}`;
  }

  statusClass(status: string) {
    return { pending: 'text-bg-warning', completed: 'text-bg-success', canceled: 'text-bg-secondary' }[status] ?? 'text-bg-light';
  }
}
