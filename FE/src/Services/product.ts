import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL } from './auth';

export interface Brand {
  _id: string;
  name: string;
  subcategoryId?: string;
  logo?: { secure_url?: string };
}

export interface CategoryItem {
  _id: string;
  name: string;
  slug?: string;
  image?: { secure_url?: string };
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: { secure_url: string; public_id?: string };
  /** extra pictures for the slider on the product page */
  images?: { secure_url: string; public_id?: string }[];
  stock: number;
  available?: boolean;
  /** false = hidden from the store by the admin */
  visible?: boolean;
  size?: string[];
  color?: string[];
  /** populated by the backend as { _id, name }, or a plain id */
  brandId?: Brand | string | null;
  createdAt?: string;
}

export interface SubcategoryItem {
  _id: string;
  name: string;
  slug?: string;
}

/** a category with its subcategories (navbar menu) */
export interface MenuCategory extends CategoryItem {
  subcategories: SubcategoryItem[];
}

/** what every paged list sends back next to the items */
export interface PageInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductPage extends PageInfo {
  products: Product[];
}

export interface CategoryPage extends ProductPage {
  category: CategoryItem;
  subcategories: SubcategoryItem[];
}

/** cover first, then the gallery pictures (no duplicates) */
export const productPictures = (p: Product): string[] => {
  const all = [p.image?.secure_url, ...(p.images ?? []).map((i) => i.secure_url)].filter(Boolean) as string[];
  return [...new Set(all)];
};

/** brand name whether brandId is populated or not */
export const brandName = (p: Product) =>
  p.brandId && typeof p.brandId === 'object' ? p.brandId.name : '';
export const brandIdOf = (p: Product) =>
  p.brandId && typeof p.brandId === 'object' ? p.brandId._id : (p.brandId ?? '');

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private url = `${API_URL}/product`; // your mount path

  /** one page of the store (newest first) */
  getAll(page = 1, limit = 20) {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ProductPage>(`${this.url}/Get_All_Product`, { params });
  }

  getOne(id: string) {
    return this.http
      .get<{ product: Product }>(`${this.url}/Get_Product/${id}`)
      .pipe(map((r) => r.product));
  }

  /** one page of a category; sub = only that subcategory */
  getByCategory(categoryId: string, page = 1, sub?: string | null) {
    let params = new HttpParams().set('page', page);
    if (sub) params = params.set('sub', sub);
    return this.http.get<CategoryPage>(`${this.url}/Get_Products_By_Category/${categoryId}`, { params });
  }

  /** categories with their subcategories, for the navbar menu */
  getCategoryMenu() {
    return this.http
      .get<{ categories: MenuCategory[] }>(`${API_URL}/category_menu`)
      .pipe(map((r) => r.categories ?? []));
  }

  getCategories() {
    return this.http
      .get<{ Categories: CategoryItem[] }>(`${API_URL}/get_all_category`)
      .pipe(map((r) => r.Categories ?? []));
  }

  getBrands() {
    return this.http
      .get<{ brands: Brand[] }>(`${API_URL}/get_all_brand`)
      .pipe(map((r) => r.brands ?? []));
  }

  // ---------- admin ----------

  /** admin: every product, hidden ones too */
  adminAll() {
    return this.http.get<{ products: Product[] }>(`${API_URL}/admin/products`).pipe(map((r) => r.products));
  }

  /** admin: show / hide in the store */
  setVisibility(id: string, visible: boolean) {
    return this.http
      .patch<{ product: Product; message: string }>(`${API_URL}/admin/products/${id}/visibility`, { visible })
      .pipe(map((r) => r.product));
  }

  /** form must contain: name, price, stock, brandId, image (cover) (+ optional images[], description, size, color, visible) */
  add(form: FormData) {
    return this.http.post<{ product: Product }>(`${this.url}/Add_Product`, form).pipe(map((r) => r.product));
  }

  /** form must contain: id + any fields to change (image = new cover, images = extra pictures, removeImages = public_ids) */
  update(form: FormData) {
    return this.http.post<{ product: Product }>(`${this.url}/Update_Product`, form).pipe(map((r) => r.product));
  }

  delete(id: string) {
    return this.http.post<{ message: string }>(`${this.url}/Delete_Product`, { id });
  }
}
