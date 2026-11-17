import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Brand, ProductService } from '../../../Services/product';

@Component({
  selector: 'app-add-product',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './add-product.html',
  styleUrl: './add-product.css',
})
export class AddProduct implements OnInit {
  private fb = inject(FormBuilder);
  private products = inject(ProductService);

  brands = signal<Brand[]>([]);
  imageFile = signal<File | null>(null);
  preview = signal<string | null>(null);
  imageTouched = signal(false);
  /** extra pictures for the product page slider (max 8) */
  gallery = signal<{ file: File; url: string }[]>([]);
  readonly maxGallery = 8;
  visible = signal(true);
  saving = signal(false);
  message = signal('');
  messageType = signal<'success' | 'danger'>('success');
  lastAddedId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    stock: [null as number | null, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    brandId: ['', Validators.required],
    description: [''],
    size: [''],
    color: [''],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit() {
    this.products.getBrands().subscribe({
      next: (b) => this.brands.set(b),
      error: () => this.flash('danger', 'Could not load brands. Add a brand first.'),
    });
  }

  onImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageTouched.set(true);
    if (file && !file.type.startsWith('image/')) {
      this.flash('danger', 'Please choose an image file.');
      input.value = '';
      return;
    }
    this.imageFile.set(file);
    if (this.preview()) URL.revokeObjectURL(this.preview()!);
    this.preview.set(file ? URL.createObjectURL(file) : null);
  }

  submit() {
    this.imageTouched.set(true);
    if (this.form.invalid || !this.imageFile()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const data = new FormData();
    data.append('name', v.name.trim());
    data.append('price', String(v.price));
    data.append('stock', String(v.stock));
    data.append('brandId', v.brandId);
    if (v.description.trim()) data.append('description', v.description.trim());
    if (v.size.trim()) data.append('size', v.size);
    if (v.color.trim()) data.append('color', v.color);
    data.append('image', this.imageFile()!);
    for (const g of this.gallery()) data.append('images', g.file);
    data.append('visible', String(this.visible()));

    this.saving.set(true);
    this.message.set('');
    this.products
      .add(data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (p) => {
          this.lastAddedId.set(p?._id ?? null);
          this.flash('success', `"${v.name}" was added.`);
          this.reset();
        },
        error: (err) => this.flash('danger', err.error?.message ?? 'Could not add the product.'),
      });
  }

  reset() {
    this.form.reset();
    this.imageFile.set(null);
    if (this.preview()) URL.revokeObjectURL(this.preview()!);
    this.preview.set(null);
    this.imageTouched.set(false);
    this.gallery().forEach((g) => URL.revokeObjectURL(g.url));
    this.gallery.set([]);
    this.visible.set(true);
  }

  onGallery(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/'));
    input.value = '';
    const room = this.maxGallery - this.gallery().length;
    if (files.length > room) this.flash('danger', `You can add up to ${this.maxGallery} extra pictures.`);
    const added = files.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
    this.gallery.update((g) => [...g, ...added]);
  }

  removeGallery(i: number) {
    const g = this.gallery()[i];
    if (g) URL.revokeObjectURL(g.url);
    this.gallery.update((list) => list.filter((_, j) => j !== i));
  }

  private flash(type: 'success' | 'danger', text: string) {
    this.messageType.set(type);
    this.message.set(text);
  }
}
