import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Address } from '../../../Services/user';

export interface AddressFormResult {
  address: Address;
  /** "save to my address book" (checkout) or "make default" (profile) */
  save: boolean;
}

@Component({
  selector: 'app-address-form',
  imports: [FormsModule],
  templateUrl: './address-form.html',
})
export class AddressForm implements OnInit {
  /** address to edit (leave empty for a new one) */
  initial = input<Address | null>(null);
  /** text next to the checkbox; empty = no checkbox */
  checkboxLabel = input('');
  checkboxDefault = input(true);
  submitLabel = input('Save address');
  busy = input(false);
  showCancel = input(true);

  submitted = output<AddressFormResult>();
  cancelled = output<void>();

  labels = ['Home', 'Work', 'Other'];
  /** which chip is picked; with 'Other' the customer types their own name */
  kind = 'Home';
  customName = '';
  phonePattern = /^\+?[0-9]{8,15}$/;
  check = signal(true);

  model: Address = { label: 'Home', phone: '', city: '', area: '', street: '', building: '', notes: '' };

  ngOnInit() {
    const a = this.initial();
    if (a) {
      this.model = { ...this.model, ...a };
      if (a.label === 'Home' || a.label === 'Work') this.kind = a.label;
      else {
        this.kind = 'Other';
        this.customName = a.label && a.label !== 'Other' ? a.label : '';
      }
    }
    this.check.set(this.checkboxDefault());
  }

  submit(f: NgForm) {
    if (f.invalid || (this.kind === 'Other' && !this.customName.trim())) {
      f.control.markAllAsTouched();
      return;
    }
    const clean: Address = {
      label: this.kind === 'Other' ? this.customName.trim() : this.kind,
      phone: this.model.phone.trim(),
      city: this.model.city.trim(),
      area: this.model.area?.trim(),
      street: this.model.street.trim(),
      building: this.model.building?.trim(),
      notes: this.model.notes?.trim(),
    };
    this.submitted.emit({ address: clean, save: this.check() });
  }
}
