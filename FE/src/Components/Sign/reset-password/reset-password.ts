import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../Services/auth';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: '../login/login.css', // reuse the eye-toggle styles from the login page
})
export class ResetPassword {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private token = this.route.snapshot.paramMap.get('token') ?? '';

  // same rule as the register form: upper + lower + number, 8+ chars
  passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

  data = { newpassword: '', confirmPassword: '' };
  showPassword = signal(false);
  isLoading = signal(false);
  done = signal(false);
  errorMessage = signal('');
  linkProblem = signal(false); // expired / already used -> offer a new link

  onSubmit(form: NgForm) {
    if (form.invalid || this.data.newpassword !== this.data.confirmPassword) {
      form.control.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.linkProblem.set(false);

    this.auth
      .resetPassword(this.token, this.data.newpassword, this.data.confirmPassword)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          // password changed -> old login is no longer valid
          if (this.auth.isLoggedIn()) this.auth.logout();
          this.done.set(true);
        },
        error: (err) => {
          const msg: string = err.error?.message ?? 'Could not reset your password.';
          this.errorMessage.set(err.status === 0 ? 'Cannot reach the server. Check your connection.' : msg);
          this.linkProblem.set(/link/i.test(msg));
        },
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
