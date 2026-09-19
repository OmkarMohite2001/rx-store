import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { NotificationService } from '../../core/services/notification';
import { UserService } from '../../core/services/user';

@Component({
  selector: 'app-profile',
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  user$ = this.authService.user$;

  // Auto-save reactive status
  saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  lastSaved = signal<Date | null>(null);

  profileForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const user = this.authService.currentUser;
    const userId = user?.id || 1;

    // Load initial user details
    this.userService
      .getUserProfile(userId)
      .pipe(
        take(1),
        tap((profile) => {
          this.profileForm.patchValue(
            {
              firstName: profile.firstName || user?.firstName || '',
              lastName: profile.lastName || user?.lastName || '',
              email: profile.email || user?.email || '',
              phone: profile.phone || '',
              address: profile.address?.address || '',
              city: profile.address?.city || '',
            },
            { emitEvent: false }
          );
        }),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    // Phase 25: Auto-Save reactive pipeline
    // valueChanges -> debounceTime -> distinctUntilChanged -> tap -> switchMap -> save -> catchError
    this.profileForm.valueChanges
      .pipe(
        debounceTime(1000), // Wait 1 second after user stops typing
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        tap(() => {
          this.saveStatus.set('saving');
        }),
        switchMap((formData) => {
          if (this.profileForm.invalid) {
            this.saveStatus.set('error');
            return of(null);
          }

          return this.userService
            .updateUserProfile(userId, {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
            })
            .pipe(
              tap(() => {
                this.saveStatus.set('saved');
                this.lastSaved.set(new Date());
                this.notificationService.success('Profile saved automatically');
              }),
              catchError((err) => {
                console.error('Auto-save error:', err);
                this.saveStatus.set('error');
                this.notificationService.error('Failed to auto-save profile');
                return of(null);
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  logout(): void {
    this.authService.logout();
  }
}
