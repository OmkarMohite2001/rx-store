import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import {
  catchError,
  filter,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { CartService } from '../../core/services/cart';
import { ProductService } from '../../core/services/product';
import { Product } from '../../models/product';

@Component({
  selector: 'app-product-details',
  imports: [
    AsyncPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetails {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  selectedImageIndex = signal<number>(0);
  quantity = signal<number>(1);

  // Loading and Error handling
  loadingSubject = new BehaviorSubject<boolean>(true);
  errorSubject = new BehaviorSubject<string | null>(null);
  retrySubject = new Subject<void>();

  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  // Phase 16: Private click Subject for Add to Cart
  private addToCartClick$ = new Subject<number>();

  // Phase 2: Route paramMap -> map(Number) -> switchMap -> getProductById
  readonly product$ = combineLatest([
    this.route.paramMap,
    this.retrySubject.pipe(startWith(null)),
  ]).pipe(
    map(([params]) => {
      const idParam = params.get('id');
      const numericId = Number(idParam);
      if (!idParam || isNaN(numericId)) {
        throw new Error('Invalid Product ID');
      }
      return numericId;
    }),
    tap(() => {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap((id) =>
      this.productService.getProductById(id).pipe(
        catchError((err) => {
          console.error('Error fetching product:', err);
          this.errorSubject.next(
            'Product not found or failed to load. Please try again.'
          );
          return of(null);
        }),
        finalize(() => {
          this.loadingSubject.next(false);
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    // Phase 16: Subject -> withLatestFrom(product$) -> tap() -> update cart
    this.addToCartClick$
      .pipe(
        withLatestFrom(this.product$.pipe(filter((p): p is Product => !!p))),
        tap(([qty, product]) => {
          this.cartService.addToCart(product, qty);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  // Public method bound in template; do not expose .next() directly
  onAddToCart(): void {
    this.addToCartClick$.next(this.quantity());
  }

  changeQuantity(delta: number): void {
    const current = this.quantity();
    const next = current + delta;
    if (next >= 1) {
      this.quantity.set(next);
    }
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  retry(): void {
    this.retrySubject.next();
  }
}
