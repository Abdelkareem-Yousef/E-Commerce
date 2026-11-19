import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ProductCard } from '../Product/product-card/product-card';
import { Pager } from '../shared/pager/pager';
import { Brand, MenuCategory, Product, ProductService, SearchSort } from '../../Services/product';

/**
 * /search?q=iphone&category=...&brand=...&minPrice=100&maxPrice=900&sort=price_asc&page=2
 * every filter lives in the URL: back button, refresh and shared links all keep them
 */
@Component({
  selector: 'app-search',
  imports: [FormsModule, RouterLink, ProductCard, Pager],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private products = inject(ProductService);
  private destroyRef = inject(DestroyRef);

  // filter options
  categories = signal<MenuCategory[]>([]);
  brands = signal<Brand[]>([]);

  // current filters (from the URL)
  q = signal('');
  category = signal('');
  brand = signal('');
  sort = signal<SearchSort>('relevance');
  minPrice: number | null = null; // the two price boxes (applied with the button)
  maxPrice: number | null = null;
  priceApplied = signal(false);

  // results
  results = signal<Product[]>([]);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  loading = signal(true);
  error = signal(false);

  /** brands of the chosen category (a brand can be in several), or every brand */
  brandOptions = computed(() => this.brandOptionsFor(this.category()));

  hasFilters = computed(() => !!(this.category() || this.brand() || this.priceApplied()));

  ngOnInit() {
    this.products.getCategoryMenu().subscribe({ next: (c) => this.categories.set(c) });
    this.products.getBrands().subscribe({ next: (b) => this.brands.set(b) });

    this.route.queryParamMap
      .pipe(
        tap((p) => {
          this.q.set(p.get('q') ?? '');
          this.category.set(p.get('category') ?? '');
          this.brand.set(p.get('brand') ?? '');
          this.sort.set((p.get('sort') as SearchSort) || (p.get('q') ? 'relevance' : 'newest'));
          this.minPrice = p.get('minPrice') ? Number(p.get('minPrice')) : null;
          this.maxPrice = p.get('maxPrice') ? Number(p.get('maxPrice')) : null;
          this.priceApplied.set(this.minPrice !== null || this.maxPrice !== null);
          this.loading.set(true);
          this.error.set(false);
        }),
        // a new search cancels the previous one if it hasn't answered yet
        switchMap((p) =>
          this.products
            .search({
              q: p.get('q') ?? '',
              category: p.get('category') ?? '',
              brand: p.get('brand') ?? '',
              minPrice: p.get('minPrice') ?? '',
              maxPrice: p.get('maxPrice') ?? '',
              sort: (p.get('sort') as SearchSort) || undefined,
              page: Number(p.get('page')) || 1,
            })
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (!res) {
          this.error.set(true);
          this.results.set([]);
        } else {
          this.results.set(res.products);
          this.page.set(res.page);
          this.totalPages.set(res.totalPages);
          this.total.set(res.total);
          this.sort.set(res.sort);
        }
        this.loading.set(false);
      });
  }

  /** change some filters, go back to page 1 (null removes a filter from the URL) */
  private apply(changes: Record<string, string | number | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...changes, page: null },
      queryParamsHandling: 'merge',
    });
  }

  setCategory(id: string) {
    // the chosen brand may not exist in the new category
    const keepBrand = !id || this.brandOptionsFor(id).some((b) => b._id === this.brand());
    this.apply({ category: id || null, ...(keepBrand ? {} : { brand: null }) });
  }

  setBrand(id: string) {
    this.apply({ brand: id || null });
  }

  setSort(sort: string) {
    this.apply({ sort });
  }

  applyPrice() {
    const clean = (v: number | null) => (v === null || v === undefined || String(v) === '' || v < 0 ? null : v);
    this.apply({ minPrice: clean(this.minPrice), maxPrice: clean(this.maxPrice) });
  }

  clearFilters() {
    this.router.navigate([], { relativeTo: this.route, queryParams: { q: this.q() || null } });
  }

  goTo(page: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** brands of a category (a brand can be in several), or every brand */
  private brandOptionsFor(categoryId: string) {
    const cat = this.categories().find((c) => c._id === categoryId);
    if (!cat) return this.brands();
    const subs = new Set(cat.subcategories.map((s) => s._id));
    return this.brands().filter((b) => (b.subcategoryId ?? []).some((id) => subs.has(id)));
  }
}
