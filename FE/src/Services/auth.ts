import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../environments/environment';

interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

export interface LoginUser {
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface LoginResponse {
  message: string;
  token: string;
  user: LoginUser;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  gender: string;
}

/** backend address: localhost on your computer, the Render URL on the live site (see src/environments) */
export const API_URL = environment.apiUrl;

/**
 * Sessions:
 *  - access token (15 min): kept ONLY in memory (this signal). Not in localStorage/sessionStorage,
 *    so a malicious script can't find it in storage, and it disappears when the tab closes.
 *  - refresh token: in an httpOnly cookie set by the backend. JavaScript can't read it at all;
 *    the browser sends it to POST /refresh, which returns a new access token.
 *  - page load: init() calls /refresh, so you stay logged in after a reload ("remember me" = 30 days).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = API_URL;
  /** cookies are only sent / saved when this is set */
  private cred = { withCredentials: true };

  /** the token as a signal, so the navbar / guards update the moment you log in or out */
  private tokenSig = signal<string | null>(null);
  private userSig = signal<LoginUser | null>(null);
  /** one /refresh at a time: requests that fail together wait for the same refresh */
  private refreshing$: Observable<string | null> | null = null;

  constructor() {
    this.clearOldStorage();
  }

  readonly token = this.tokenSig.asReadonly();
  readonly user = this.userSig.asReadonly();
  readonly loggedIn = computed(() => !!this.tokenSig());
  readonly role = computed<string | null>(() => this.decodeRole(this.tokenSig()));
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isUser = computed(() => this.role() === 'user');
  readonly displayName = computed(() => this.userSig()?.name ?? 'Account');

  login(data: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/Login`, data, this.cred)
      .pipe(tap((res) => this.setSession(res.token, res.user)));
  }

  /** app start: restore the session from the cookie (resolves either way, never blocks the app) */
  init(): Promise<unknown> {
    return firstValueFrom(this.refresh());
  }

  /**
   * new access token from the httpOnly cookie. Several callers at once share ONE request
   * (otherwise parallel refreshes would race each other). Emits the token, or null = logged out.
   */
  refresh(): Observable<string | null> {
    if (!this.refreshing$) {
      this.refreshing$ = this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, {}, this.cred).pipe(
        map((res) => {
          this.setSession(res.token, res.user);
          return res.token;
        }),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        finalize(() => (this.refreshing$ = null)),
        shareReplay(1)
      );
    }
    return this.refreshing$;
  }

  register(data: RegisterPayload) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/register`, data);
  }

  /** sends the reset-password email */
  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/Reset_Password`, { email });
  }

  /** sets the new password using the token from the email link */
  resetPassword(token: string, newpassword: string, confirmPassword: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/Change_Password`, {
      token,
      newpassword,
      confirmPassword,
    });
  }

  /** keep the stored name in sync after editing the profile */
  updateUser(patch: Partial<LoginUser>): void {
    const current = this.userSig();
    if (!current) return;
    this.userSig.set({ ...current, ...patch });
  }

  getToken(): string | null {
    return this.tokenSig();
  }

  getRole(): string | null {
    return this.role();
  }

  /** "user" / "admin": the prefix the backend expects in the x header for this token */
  prefixFor(token: string): 'user' | 'admin' {
    return this.decodeRole(token) === 'admin' ? 'admin' : 'user';
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }

  /** ends the session on the server too (the cookie and the access token stop working at once) */
  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, this.cred).subscribe({ error: () => {} });
    this.clearSession();
  }

  /** forget the session in this tab only (the server already ended it) */
  clearSession(): void {
    this.tokenSig.set(null);
    this.userSig.set(null);
  }

  private setSession(token: string, user: LoginUser | null): void {
    this.tokenSig.set(token);
    this.userSig.set(user ?? null);
  }

  /** the old version kept the token in storage: remove it so nothing readable is left behind */
  private clearOldStorage(): void {
    for (const s of [localStorage, sessionStorage]) {
      s.removeItem('token');
      s.removeItem('user');
    }
  }

  private decodeRole(token: string | null): string | null {
    if (!token) return null;
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).role ?? null;
    } catch {
      return null;
    }
  }
}
