import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, map, tap } from 'rxjs/operators';
import { AuthState, LoginRequest, LoginResponse, RefreshResponse, User } from '../../models/auth';

const STORAGE_KEY = 'rx_store_auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://dummyjson.com/auth';

  private authStateSubject: BehaviorSubject<AuthState>;
  readonly authState$: Observable<AuthState>;
  readonly isAuthenticated$: Observable<boolean>;
  readonly user$: Observable<User | null>;

  constructor() {
    const savedState = this.loadSavedState();
    this.authStateSubject = new BehaviorSubject<AuthState>(savedState);
    this.authState$ = this.authStateSubject.asObservable();

    this.isAuthenticated$ = this.authState$.pipe(
      map((state) => state.isAuthenticated),
      distinctUntilChanged()
    );

    this.user$ = this.authState$.pipe(
      map((state) => state.user),
      distinctUntilChanged()
    );
  }

  get currentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  getAccessToken(): string | null {
    return this.authStateSubject.value.accessToken;
  }

  getRefreshToken(): string | null {
    return this.authStateSubject.value.refreshToken;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          const user: User = {
            id: response.id,
            username: response.username,
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            gender: response.gender,
            image: response.image,
          };
          const newState: AuthState = {
            user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          };
          this.updateState(newState);
        })
      );
  }

  refreshToken(): Observable<RefreshResponse> {
    const currentRefreshToken = this.getRefreshToken();
    if (!currentRefreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<RefreshResponse>(`${this.baseUrl}/refresh`, {
        refreshToken: currentRefreshToken,
        expiresInMins: 60,
      })
      .pipe(
        tap((response) => {
          const currentState = this.authStateSubject.value;
          const updatedState: AuthState = {
            ...currentState,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          };
          this.updateState(updatedState);
        }),
        catchError((err) => {
          this.logout();
          return throwError(() => err);
        })
      );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  logout(): void {
    const clearedState: AuthState = {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };
    this.updateState(clearedState);
  }

  private updateState(state: AuthState): void {
    this.authStateSubject.next(state);
    if (state.isAuthenticated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Handle private browsing or storage quota issues gracefully
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private loadSavedState(): AuthState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthState;
        if (parsed.accessToken && parsed.user) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors and fallback
    }

    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };
  }
}

