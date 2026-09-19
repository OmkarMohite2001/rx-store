import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { catchError, exhaustMap, finalize, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { NotificationService } from '../../core/services/notification';
import { LoginRequest } from '../../models/auth';

@Component({
  selector: 'app-auth',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  hidePassword = signal<boolean>(true);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  loginForm = new FormGroup({
    username: new FormControl('emilys', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('emilyspass', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // Phase 10: Private Subject triggered on form submit
  private loginSubject = new Subject<LoginRequest>();

  constructor() {
    // exhaustMap ignores concurrent submissions while request is pending
    this.loginSubject
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        exhaustMap((credentials) =>
          this.authService.login(credentials).pipe(
            tap((response) => {
              this.notificationService.success(
                `Welcome back, ${response.firstName}!`
              );
              this.router.navigate(['/dashboard']);
            }),
            catchError((err) => {
              console.error('Login error:', err);
              const msg =
                err.error?.message || 'Invalid username or password. Please try again.';
              this.errorMessage.set(msg);
              this.notificationService.error(msg);
              return of(null);
            }),
            finalize(() => {
              this.isLoading.set(false);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) {
      return;
    }
    this.loginSubject.next(this.loginForm.getRawValue());
  }

  fillDemoUser(): void {
    this.loginForm.setValue({
      username: 'emilys',
      password: 'emilyspass',
    });
  }
}
