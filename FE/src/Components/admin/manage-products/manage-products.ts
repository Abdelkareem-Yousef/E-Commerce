import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Brand, Product, ProductService, brandIdOf, brandName } from '../../../Services/product';

interface EditModel {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  brandId: string;
  description: string;
  size: string;
  color: string;
}

type StockFilter = 'all' | 'low' | 'out' | 'hidden';

@Component({
  selector: 'app-manage-products',
  imports: [FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './manage-products.html',
  styleUrl: './manage-products.css',
})
export class ManageProducts implements OnInit {
  private products = inject(ProductService);

  list = signal<Product[]>([]);
  brands = signal<Brand[]>([]);
  loading = signal(true);
  loadError = signal('');

  search = signal('');
  stockFilter = signal<StockFilter>('all');

  // edit panel
  editing = signal<EditModel | null>(null);
  editImage = signal<File | null>(null);
  editPreview = signal<string | null>(null);
  saving = signal(false);
  editError = signal('');
  /** gallery in the edit panel */
  keepImages = signal<{ secure_url: string; public_id?: string }[]>([]);
  removed = signal<string[]>([]);
  newImages = signal<{ file: File; url: string }[]>([]);
  readonly maxGallery = 8;
  togglingId = signal<string | null>(null);

  // delete: first click asks, second click deletes
  confirmDeleteId = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  brandName = brandName;

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const f = this.stockFilter();
    return this.list().filter((p) => {
      if (f === 'low' && !(p.stock > 0 && p.stock <= 5)) return false;
      if (f === 'out' && p.stock > 0) return false;
      if (f === 'hidden' && p.visible !== false) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || brandName(p).toLowerCase().includes(q);
    });
  });

  counts = computed(() => ({
    all: this.list().length,
    low: this.list().filter((p) => p.stock > 0 && p.stock <= 5).length,
    out: this.list().filter((p) => p.stock < 1).length,
    hidden: this.list().filter((p) => p.visible === false).length,
  }));

  ngOnInit() {
    this.load();
    this.products.getBrands().subscribe({ next: (b) => this.brands.set(b) });
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    this.products
      .adminAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (l) => this.list.set(l),
        error: (err) => this.loadError.set(err.error?.message ?? 'Could not load products.'),
      });
  }

  // ---------- edit ----------
  openEdit(p: Product) {
    this.confirmDeleteId.set(null);
    this.editError.set('');
    this.editImage.set(null);
    this.setPreview(null);
    this.keepImages.set([...(p.images ?? [])]);
    this.removed.set([]);
    this.clearNewImages();
    this.editing.set({
      id: p._id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      brandId: brandIdOf(p),
      description: p.description ?? '',
      size: (p.size ?? []).join(', '),
      color: (p.color ?? []).join(', '),
    });
  }

  closeEdit() {
    this.editing.set(null);
    this.setPreview(null);
    this.clearNewImages();
  }

  // ---------- gallery in the edit panel ----------
  galleryCount() {
    return this.keepImages().length + this.newImages().length;
  }

  removeExisting(img: { public_id?: string }) {
    if (img.public_id) this.removed.update((r) => [...r, img.public_id!]);
    this.keepImages.update((list) => list.filter((i) => i !== img));
  }

  onNewImages(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/'));
    input.value = '';
    const room = this.maxGallery - this.galleryCount();
    if (files.length > room) this.editError.set(`Up to ${this.maxGallery} extra pictures per product.`);
    this.newImages.update((n) => [...n, ...files.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  removeNew(i: number) {
    const n = this.newImages()[i];
    if (n) URL.revokeObjectURL(n.url);
    this.newImages.update((list) => list.filter((_, j) => j !== i));
  }

  private clearNewImages() {
    this.newImages().forEach((n) => URL.revokeObjectURL(n.url));
    this.newImages.set([]);
  }

  // ---------- show / hide ----------
  toggleVisible(p: Product) {
    const next = p.visible === false; // hidden -> show, visible -> hide
    this.togglingId.set(p._id);
    this.products
      .setVisibility(p._id, next)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.list.update((l) => l.map((x) => (x._id === p._id ? { ...x, visible: updated.visible } : x)));
          this.flash('success', next ? `"${p.name}" is visible in the store.` : `"${p.name}" is hidden from the store.`);
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not change visibility.'),
      });
  }

  currentImage(): string | undefined {
    const id = this.editing()?.id;
    return this.list().find((p) => p._id === id)?.image?.secure_url;
  }

  onEditImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !file.type.startsWith('image/')) {
      this.editError.set('Please choose an image file.');
      input.value = '';
      return;
    }
    this.editImage.set(file);
    this.setPreview(file ? URL.createObjectURL(file) : null);
  }

  saveEdit(f: NgForm) {
    const m = this.editing();
    if (!m) return;
    if (f.invalid) {
      f.control.markAllAsTouched();
      return;
    }

    const data = new FormData();
    data.append('id', m.id);
    data.append('name', m.name.trim());
    data.append('price', String(m.price));
    data.append('stock', String(m.stock));
    if (m.brandId) data.append('brandId', m.brandId);
    data.append('description', m.description.trim());
    data.append('size', m.size);
    data.append('color', m.color);
    const img = this.editImage();
    if (img) data.append('image', img);
    if (this.removed().length) data.append('removeImages', this.removed().join(','));
    for (const n of this.newImages()) data.append('images', n.file);

    this.saving.set(true);
    this.editError.set('');
    this.products
      .update(data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.flash('success', `"${m.name}" was updated.`);
          this.closeEdit();
          this.load(); // reload so the brand name is populated again
        },
        error: (err) => this.editError.set(err.error?.message ?? 'Could not save changes.'),
      });
  }

  // ---------- delete ----------
  askDelete(p: Product) {
    this.confirmDeleteId.set(p._id);
  }

  doDelete(p: Product) {
    this.deletingId.set(p._id);
    this.products
      .delete(p._id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.list.update((l) => l.filter((x) => x._id !== p._id));
          this.confirmDeleteId.set(null);
          this.flash('success', `"${p.name}" was deleted.`);
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not delete the product.'),
      });
  }

  private setPreview(url: string | null) {
    const old = this.editPreview();
    if (old) URL.revokeObjectURL(old);
    this.editPreview.set(url);
  }

  private flash(type: 'success' | 'danger', text: string) {
    this.messageType.set(type);
    this.message.set(text);
  }
}
