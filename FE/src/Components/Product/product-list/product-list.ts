import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product, ProductService } from '../../../Services/product';
import { ProductCard } from '../product-card/product-card';
import { Pager } from '../../shared/pager/pager';

/**
 * home:      <app-products-list title="New arrivals" [limit]="16" [paged]="false" />  (4 rows + "View all")
 * /products: every product, 20 per page, page number in the URL (?page=3)
 */
@Component({
  selector: 'app-products-list',
  imports: [ProductCard, Pager, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductsList implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  title = input('All products');
  limit = input(20);
  /** false = one block, no page numbers (home page) */
  paged = input(true);

  products = signal<Product[]>([]);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  isLoading = signal(true);
  error = signal(false);

  ngOnInit() {
    if (!this.paged()) {
      this.load(1);
      return;
    }
    // back / forward buttons and shared links keep the page
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.load(Number(q.get('page')) || 1));
  }

  private load(page: number) {
    this.isLoading.set(true);
    this.error.set(false);
    this.productService.getAll(page, this.limit()).subscribe({
      next: (r) => {
        this.products.set(r.products);
        this.page.set(r.page);
        this.totalPages.set(r.totalPages);
        this.total.set(r.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.isLoading.set(false);
      },
    });
  }

  goTo(page: number) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
