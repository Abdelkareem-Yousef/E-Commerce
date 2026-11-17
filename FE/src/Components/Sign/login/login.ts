import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../Services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  showPassword = signal(false);
  isLoading = signal(false);
  needsActivation = signal(false);
  errorMessage = signal('');
  logInDetails = { email: '', password: '', remember: false };

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) {}

  onSubmit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.needsActivation.set(false);

    this.authService.login(this.logInDetails)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          // go back to the page that asked for login, otherwise admin -> dashboard, user -> home
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const fallback = this.authService.isAdmin() ? '/admin' : '/home';
          this.router.navigateByUrl(returnUrl && returnUrl !== '/login' ? returnUrl : fallback);
        },
        error: (err) => {
          this.needsActivation.set(err.status === 403);

          switch (err.status) {
            case 401:
              this.errorMessage.set('Invalid email or password.');
              break;
            case 403:
              this.errorMessage.set(err.error?.message ?? 'Please activate your account first.');
              break;
            case 400:
              this.errorMessage.set(err.error?.message ?? 'Please check your input.');
              break;
            case 0:
              this.errorMessage.set('Cannot reach the server. Check your connection.');
              break;
            default:
              this.errorMessage.set('Something went wrong. Please try again.');
          }
        },
      });
  }
}
