import { AsyncPipe } from '@angular/common';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { of, Subject } from 'rxjs';
import { catchError, exhaustMap, finalize, take, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { CartService } from '../../core/services/cart';
import { NotificationService } from '../../core/services/notification';
import { OrderService } from '../../core/services/order';
import { ShippingAddress } from '../../models/order';

@Component({
  selector: 'app-checkout',
  imports: [
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly items$ = this.cartService.items$;
  readonly cartTotal$ = this.cartService.cartTotal$;
  readonly cartCount$ = this.cartService.cartCount$;
  readonly isEmpty$ = this.cartService.isEmpty$;

  isSubmitting = signal<boolean>(false);

  checkoutForm = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    postalCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
  });

  private submitOrderSubject = new Subject<ShippingAddress>();

  constructor() {
    // Pre-fill user information if authenticated
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      this.checkoutForm.patchValue({
        fullName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      });
    }

    // Phase 24: Process checkout flow using exhaustMap and sequential order creation
    this.submitOrderSubject
      .pipe(
        exhaustMap((shippingAddress) => {
          this.isSubmitting.set(true);

          return this.cartService.items$.pipe(
            take(1),
            exhaustMap((items) => {
              const userId = this.authService.currentUser?.id || 1;
              return this.orderService.createOrder(userId, items, shippingAddress).pipe(
                tap((order) => {
                  this.router.navigate(['/orders']);
                }),
                catchError((err) => {
                  console.error('Order creation error:', err);
                  this.notificationService.error(
                    'Failed to process checkout. Please try again.'
                  );
                  return of(null);
                }),
                finalize(() => {
                  this.isSubmitting.set(false);
                })
              );
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid || this.isSubmitting()) {
      this.checkoutForm.markAllAsTouched();
      return;
    }
    this.submitOrderSubject.next(this.checkoutForm.getRawValue());
  }
}

