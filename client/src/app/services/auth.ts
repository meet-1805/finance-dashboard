import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from './api';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  monthlySalary: number;
  onboardingState: 'PENDING' | 'COMPLETED';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly userKey = 'user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(payload: {
    name: string;
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${API_BASE_URL}/auth/register`,
      payload
    ).pipe(
      tap((response) => this.saveSession(response))
    );
  }

  login(payload: {
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${API_BASE_URL}/auth/login`,
      payload
    ).pipe(
      tap((response) => this.saveSession(response))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): AuthUser | null {
    const user = localStorage.getItem(this.userKey);

    if (!user) {
      return null;
    }

    try {
      return JSON.parse(user) as AuthUser;
    } catch {
      this.logout();
      return null;
    }
  }

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  }

  fetchProfile(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${API_BASE_URL}/users/profile`).pipe(
      tap((user) => {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      })
    );
  }

  completeOnboarding(payload: {
    monthlySalary: number;
    budgets?: { category: string; monthlyLimit: number }[];
  }): Observable<{ message: string; user: AuthUser }> {
    return this.http.post<{ message: string; user: AuthUser }>(
      `${API_BASE_URL}/users/onboarding`,
      payload
    ).pipe(
      tap((response) => {
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
      })
    );
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
  }
}
