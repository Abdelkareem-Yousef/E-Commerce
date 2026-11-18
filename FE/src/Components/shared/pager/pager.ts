import { Component, computed, input, output } from '@angular/core';

/** page numbers: ‹ 1 … 4 5 [6] 7 8 … 20 › */
@Component({
  selector: 'app-pager',
  template: `
    @if (totalPages() > 1) {
    <nav aria-label="Pages" class="d-flex justify-content-center mt-5">
      <ul class="pagination mb-0 gap-1">
        <li class="page-item" [class.disabled]="page() === 1">
          <button type="button" class="page-link" (click)="go(page() - 1)" aria-label="Previous page">
            <i class="bi bi-chevron-left"></i>
          </button>
        </li>
        @for (p of pages(); track $index) {
          @if (p === 0) {
          <li class="page-item disabled"><span class="page-link">…</span></li>
          } @else {
          <li class="page-item" [class.active]="p === page()">
            <button type="button" class="page-link" (click)="go(p)" [attr.aria-current]="p === page() ? 'page' : null">{{ p }}</button>
          </li>
          }
        }
        <li class="page-item" [class.disabled]="page() === totalPages()">
          <button type="button" class="page-link" (click)="go(page() + 1)" aria-label="Next page">
            <i class="bi bi-chevron-right"></i>
          </button>
        </li>
      </ul>
    </nav>
    }
  `,
  styles: `
    .page-link { min-width: 2.5rem; text-align: center; border-radius: 0.75rem !important; }
  `,
})
export class Pager {
  page = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();

  /** current page ±2, plus first and last; 0 = "…" */
  pages = computed(() => {
    const total = this.totalPages();
    const cur = this.page();
    const from = Math.max(1, cur - 2);
    const to = Math.min(total, cur + 2);
    const out: number[] = [];
    if (from > 1) {
      out.push(1);
      if (from > 2) out.push(0);
    }
    for (let i = from; i <= to; i++) out.push(i);
    if (to < total) {
      if (to < total - 1) out.push(0);
      out.push(total);
    }
    return out;
  });

  go(p: number) {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) this.pageChange.emit(p);
  }
}
