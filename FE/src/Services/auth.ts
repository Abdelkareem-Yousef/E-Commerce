import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = API_URL;

  /** the token as a signal, so the navbar / guards update the moment you log in or out */
  private tokenSig = signal<string | null>(this.readToken());
  private userSig = signal<LoginUser | null>(this.readUser());

  readonly token = this.tokenSig.asReadonly();
  readonly user = this.userSig.asReadonly();
  readonly loggedIn = computed(() => !!this.tokenSig());
  readonly role = computed<string | null>(() => this.decodeRole(this.tokenSig()));
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isUser = computed(() => this.role() === 'user');
  readonly displayName = computed(() => this.userSig()?.name ?? 'Account');

  login(data: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/Login`, data)
      .pipe(tap((res) => this.saveSession(res.token, res.user, data.remember)));
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

  /** called by the interceptor when the backend sends a refreshed token */
  replaceToken(token: string): void {
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('token', token);
    this.tokenSig.set(token);
  }

  /** keep the stored name in sync after editing the profile */
  updateUser(patch: Partial<LoginUser>): void {
    const current = this.userSig();
    if (!current) return;
    const next = { ...current, ...patch };
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(next));
    this.userSig.set(next);
  }

  getToken(): string | null {
    return this.tokenSig();
  }

  getRole(): string | null {
    return this.role();
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }

  logout(): void {
    this.clearStorage();
    this.tokenSig.set(null);
    this.userSig.set(null);
  }

  private saveSession(token: string, user: LoginUser, remember: boolean): void {
    this.clearStorage(); // never keep a token in both places
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('token', token);
    if (user) storage.setItem('user', JSON.stringify(user));
    this.tokenSig.set(token);
    this.userSig.set(user ?? null);
  }

  private readToken(): string | null {
    return localStorage.getItem('token') ?? sessionStorage.getItem('token');
  }

  private readUser(): LoginUser | null {
    const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private clearStorage(): void {
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
