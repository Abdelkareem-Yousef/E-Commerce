import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../Services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  email = this.route.snapshot.queryParamMap.get('email') ?? '';
  isLoading = signal(false);
  sent = signal(false);
  errorMessage = signal('');

  onSubmit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auth
      .forgotPassword(this.email.trim())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.sent.set(true),
        error: (err) =>
          this.errorMessage.set(
            err.status === 0 ? 'Cannot reach the server. Check your connection.' : err.error?.message ?? 'Something went wrong.'
          ),
      });
  }
}
