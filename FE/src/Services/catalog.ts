import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL } from './auth';

export interface CatalogImage {
  secure_url?: string;
  public_id?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug?: string;
  image?: CatalogImage;
}

export interface Subcategory {
  _id: string;
  name: string;
  slug?: string;
  CategoryId: string;
}

export interface CatalogBrand {
  _id: string;
  name: string;
  slug?: string;
  logo?: CatalogImage;
  /** a brand can be in many subcategories */
  subcategoryId: string[];
}

/** admin: categories -> subcategories <-> brands (a product picks one subcategory + one brand) */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);
  private url = API_URL;

  // ---------- read ----------
  categories() {
    return this.http.get<{ Categories: Category[] }>(`${this.url}/get_all_category`).pipe(map((r) => r.Categories ?? []));
  }
  subcategories() {
    return this.http
      .get<{ subCategories: Subcategory[] }>(`${this.url}/get_all_subcategory`)
      .pipe(map((r) => r.subCategories ?? []));
  }
  brands() {
    return this.http.get<{ brands: CatalogBrand[] }>(`${this.url}/get_all_brand`).pipe(map((r) => r.brands ?? []));
  }

  // ---------- categories (image is a file) ----------
  addCategory(name: string, image: File) {
    const f = new FormData();
    f.append('name', name);
    f.append('image', image);
    return this.http.post<{ category: Category }>(`${this.url}/add_category`, f).pipe(map((r) => r.category));
  }
  updateCategory(id: string, newname: string, image?: File | null) {
    const f = new FormData();
    f.append('id', id);
    if (newname) f.append('newname', newname);
    if (image) f.append('image', image);
    return this.http.patch<{ category: Category }>(`${this.url}/update_category`, f).pipe(map((r) => r.category));
  }
  deleteCategory(id: string) {
    return this.http.delete<{ message: string }>(`${this.url}/delete_category`, { body: { id } });
  }

  // ---------- subcategories ----------
  addSubcategory(name: string, CategoryId: string) {
    return this.http
      .post<{ subcategory: Subcategory }>(`${this.url}/add_subcategory`, { name, CategoryId })
      .pipe(map((r) => r.subcategory));
  }
  updateSubcategory(id: string, newname: string, CategoryId?: string) {
    return this.http
      .patch<{ subcategory: Subcategory }>(`${this.url}/update_subcategory`, { id, newname: newname || undefined, CategoryId })
      .pipe(map((r) => r.subcategory));
  }
  deleteSubcategory(id: string) {
    return this.http.delete<{ message: string }>(`${this.url}/delete_subcategory`, { body: { id } });
  }

  // ---------- brands (logo is a file) ----------
  addBrand(name: string, subcategoryIds: string[], logo: File) {
    const f = new FormData();
    f.append('name', name);
    f.append('subcategoryId', subcategoryIds.join(','));
    f.append('logo', logo);
    return this.http.post<{ brand: CatalogBrand }>(`${this.url}/add_brand`, f).pipe(map((r) => r.brand));
  }
  /** subcategoryIds = the FULL new list (leave out to keep the current one) */
  updateBrand(id: string, newname: string, subcategoryIds?: string[] | null, logo?: File | null) {
    const f = new FormData();
    f.append('id', id);
    if (newname) f.append('newname', newname);
    // sent as one "a,b,c" field so a single id still arrives as a list
    if (subcategoryIds) f.append('subcategoryId', subcategoryIds.join(','));
    if (logo) f.append('logo', logo);
    return this.http.patch<{ brand: CatalogBrand }>(`${this.url}/update_brand`, f).pipe(map((r) => r.brand));
  }
  deleteBrand(id: string) {
    return this.http.delete<{ message: string }>(`${this.url}/delete_brand`, { body: { id } });
  }
}
