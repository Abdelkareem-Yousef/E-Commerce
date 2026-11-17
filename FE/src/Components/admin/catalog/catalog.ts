import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, Observable } from 'rxjs';
import { CatalogBrand, CatalogService, Category, Subcategory } from '../../../Services/catalog';
import { ProductService, brandIdOf } from '../../../Services/product';

type Kind = 'cat' | 'sub' | 'brand';

interface FormState {
  kind: Kind;
  mode: 'add' | 'edit';
  id?: string;
}

/** Admin: Categories -> Subcategories -> Brands in three linked columns */
@Component({
  selector: 'app-admin-catalog',
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class AdminCatalog implements OnInit {
  private catalog = inject(CatalogService);
  private products = inject(ProductService);

  cats = signal<Category[]>([]);
  subs = signal<Subcategory[]>([]);
  brands = signal<CatalogBrand[]>([]);
  /** brandId -> how many products use it */
  productCount = signal<Record<string, number>>({});

  loading = signal(true);
  loadError = signal('');

  selectedCat = signal<string | null>(null);
  selectedSub = signal<string | null>(null);

  // one add/edit form open at a time
  form = signal<FormState | null>(null);
  name = '';
  parentId = '';
  file = signal<File | null>(null);
  preview = signal<string | null>(null);
  saving = signal(false);
  formError = signal('');

  confirmDelete = signal<{ kind: Kind; id: string } | null>(null);
  deleting = signal(false);

  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  // ---------- derived lists ----------
  subsOfCat = computed(() => this.subs().filter((s) => s.CategoryId === this.selectedCat()));
  brandsOfSub = computed(() => this.brands().filter((b) => b.subcategoryId === this.selectedSub()));
  catName = computed(() => this.cats().find((c) => c._id === this.selectedCat())?.name ?? '');
  subName = computed(() => this.subs().find((s) => s._id === this.selectedSub())?.name ?? '');

  subCount(catId: string) {
    return this.subs().filter((s) => s.CategoryId === catId).length;
  }
  brandCount(subId: string) {
    return this.brands().filter((b) => b.subcategoryId === subId).length;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      cats: this.catalog.categories(),
      subs: this.catalog.subcategories(),
      brands: this.catalog.brands(),
      products: this.products.adminAll(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ cats, subs, brands, products }) => {
          this.cats.set(cats);
          this.subs.set(subs);
          this.brands.set(brands);
          const counts: Record<string, number> = {};
          for (const p of products) {
            const id = brandIdOf(p);
            if (id) counts[id] = (counts[id] ?? 0) + 1;
          }
          this.productCount.set(counts);
          // keep the selection if it still exists, otherwise pick the first
          if (!cats.some((c) => c._id === this.selectedCat())) this.selectedCat.set(cats[0]?._id ?? null);
          if (!subs.some((s) => s._id === this.selectedSub() && s.CategoryId === this.selectedCat())) {
            this.selectedSub.set(this.subsOfCat()[0]?._id ?? null);
          }
        },
        error: (err) => this.loadError.set(err.error?.message ?? 'Could not load categories and brands.'),
      });
  }

  pickCat(id: string) {
    this.selectedCat.set(id);
    this.selectedSub.set(this.subsOfCat()[0]?._id ?? null);
  }

  pickSub(id: string) {
    this.selectedSub.set(id);
  }

  // ---------- add / edit ----------
  openAdd(kind: Kind) {
    this.resetForm();
    this.parentId = kind === 'sub' ? this.selectedCat() ?? '' : kind === 'brand' ? this.selectedSub() ?? '' : '';
    this.form.set({ kind, mode: 'add' });
  }

  openEdit(kind: Kind, item: Category | Subcategory | CatalogBrand, event: Event) {
    event.stopPropagation();
    this.resetForm();
    this.name = item.name;
    if (kind === 'sub') this.parentId = (item as Subcategory).CategoryId;
    if (kind === 'brand') this.parentId = (item as CatalogBrand).subcategoryId;
    this.form.set({ kind, mode: 'edit', id: item._id });
  }

  isEditing(kind: Kind, id: string) {
    const f = this.form();
    return f?.kind === kind && f.mode === 'edit' && f.id === id;
  }

  currentImage(): string | undefined {
    const f = this.form();
    if (!f || f.mode !== 'edit') return undefined;
    if (f.kind === 'cat') return this.cats().find((c) => c._id === f.id)?.image?.secure_url;
    if (f.kind === 'brand') return this.brands().find((b) => b._id === f.id)?.logo?.secure_url;
    return undefined;
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    input.value = '';
    if (f && !f.type.startsWith('image/')) {
      this.formError.set('Please choose an image file.');
      return;
    }
    this.file.set(f);
    if (this.preview()) URL.revokeObjectURL(this.preview()!);
    this.preview.set(f ? URL.createObjectURL(f) : null);
  }

  closeForm() {
    this.resetForm();
    this.form.set(null);
  }

  save() {
    const f = this.form();
    if (!f) return;
    const name = this.name.trim();
    if (name.length < 3) {
      this.formError.set('Name must be at least 3 characters.');
      return;
    }
    if (f.mode === 'add' && f.kind !== 'sub' && !this.file()) {
      this.formError.set(f.kind === 'cat' ? 'Choose a category image.' : 'Choose a brand logo.');
      return;
    }

    let req$: Observable<{ _id: string }>;
    if (f.kind === 'cat') {
      req$ = f.mode === 'add' ? this.catalog.addCategory(name, this.file()!) : this.catalog.updateCategory(f.id!, name, this.file());
    } else if (f.kind === 'sub') {
      req$ = f.mode === 'add'
        ? this.catalog.addSubcategory(name, this.parentId)
        : this.catalog.updateSubcategory(f.id!, name, this.parentId);
    } else {
      req$ = f.mode === 'add'
        ? this.catalog.addBrand(name, this.parentId, this.file()!)
        : this.catalog.updateBrand(f.id!, name, this.parentId, this.file());
    }

    this.saving.set(true);
    this.formError.set('');
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        const label = { cat: 'Category', sub: 'Subcategory', brand: 'Brand' }[f.kind];
        this.flash('success', `${label} "${name}" ${f.mode === 'add' ? 'added' : 'updated'}.`);
        // select what was just added / moved so it's visible
        if (f.kind === 'cat') this.selectedCat.set(saved._id);
        if (f.kind === 'sub') {
          this.selectedCat.set(this.parentId);
          this.selectedSub.set(saved._id);
        }
        if (f.kind === 'brand') {
          const sub = this.subs().find((s) => s._id === this.parentId);
          if (sub) this.selectedCat.set(sub.CategoryId);
          this.selectedSub.set(this.parentId);
        }
        this.closeForm();
        this.load();
      },
      error: (err) => this.formError.set(err.error?.message ?? 'Could not save.'),
    });
  }

  // ---------- delete ----------
  askDelete(kind: Kind, id: string, event: Event) {
    event.stopPropagation();
    this.confirmDelete.set({ kind, id });
  }

  isConfirming(kind: Kind, id: string) {
    const c = this.confirmDelete();
    return c?.kind === kind && c.id === id;
  }

  doDelete(event: Event) {
    event.stopPropagation();
    const c = this.confirmDelete();
    if (!c) return;
    const req$ =
      c.kind === 'cat' ? this.catalog.deleteCategory(c.id)
        : c.kind === 'sub' ? this.catalog.deleteSubcategory(c.id)
        : this.catalog.deleteBrand(c.id);
    this.deleting.set(true);
    req$.pipe(finalize(() => this.deleting.set(false))).subscribe({
      next: () => {
        this.confirmDelete.set(null);
        this.flash('success', 'Deleted.');
        this.load();
      },
      error: (err) => {
        this.confirmDelete.set(null);
        // e.g. "still has 2 subcategories, delete or move them first"
        this.flash('danger', err.error?.message ?? 'Could not delete.');
      },
    });
  }

  cancelDelete(event: Event) {
    event.stopPropagation();
    this.confirmDelete.set(null);
  }

  private resetForm() {
    this.name = '';
    this.parentId = '';
    this.file.set(null);
    if (this.preview()) URL.revokeObjectURL(this.preview()!);
    this.preview.set(null);
    this.formError.set('');
    this.confirmDelete.set(null);
  }

  private flash(type: 'success' | 'danger', text: string) {
    this.messageType.set(type);
    this.message.set(text);
  }
}
