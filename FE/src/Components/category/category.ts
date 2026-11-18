import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, of, switchMap, tap } from 'rxjs';
import { ProductCard } from '../Product/product-card/product-card';
import { Pager } from '../shared/pager/pager';
import { CategoryItem, Product, ProductService, SubcategoryItem } from '../../Services/product';

/** /category/:id?sub=<subcategoryId>&page=2  -> 20 products per page */
@Component({
  selector: 'app-category',
  imports: [ProductCard, RouterLink, Pager],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class Category implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);

  category = signal<CategoryItem | null>(null);
  subcategories = signal<SubcategoryItem[]>([]);
  products = signal<Product[]>([]);
  activeSub = signal<string | null>(null);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  loading = signal(true);
  notFound = signal(false);

  activeSubName = computed(() => this.subcategories().find((s) => s._id === this.activeSub())?.name ?? '');

  ngOnInit() {
    // id, sub and page can change together (navbar menu) -> wait one tick, then load once;
    // switchMap drops an old request if the user clicks again before it answers
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        debounceTime(0),
        tap(([, q]) => {
          this.loading.set(true);
          this.notFound.set(false);
          this.activeSub.set(q.get('sub'));
        }),
        switchMap(([p, q]) =>
          this.productService
            .getByCategory(p.get('id') ?? '', Number(q.get('page')) || 1, q.get('sub'))
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (!res) {
          this.category.set(null);
          this.products.set([]);
          this.notFound.set(true);
        } else {
          this.category.set(res.category);
          this.subcategories.set(res.subcategories ?? []);
          this.products.set(res.products);
          this.page.set(res.page);
          this.totalPages.set(res.totalPages);
          this.total.set(res.total);
        }
        this.loading.set(false);
      });
  }

  /** null = all subcategories; always back to page 1 */
  pickSub(id: string | null) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { sub: id } });
  }

  goTo(page: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
