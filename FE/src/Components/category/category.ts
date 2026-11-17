import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductCard } from '../Product/product-card/product-card';
import { CategoryItem, Product, ProductService } from '../../Services/product';

@Component({
  selector: 'app-category',
  imports: [ProductCard, RouterLink],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class Category implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);

  products = signal<Product[]>([]);
  category = signal<CategoryItem | null>(null);
  loading = signal(true);
  notFound = signal(false);

  ngOnInit() {
    // re-runs when you switch category from the navbar
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.loading.set(true);
      this.notFound.set(false);
      this.productService.getByCategory(id).subscribe({
        next: (res) => {
          this.category.set(res.category);
          this.products.set(res.products);
          this.loading.set(false);
        },
        error: () => {
          this.category.set(null);
          this.products.set([]);
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
    });
  }
}
