import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, from, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  mergeMap,
  switchMap,
  tap,
  toArray,
} from 'rxjs/operators';
import { CartService } from '../../core/services/cart';
import { NotificationService } from '../../core/services/notification';
import { ProductService } from '../../core/services/product';
import { Product } from '../../models/product';

@Component({
  selector: 'app-compare',
  imports: [
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
})
export class Compare implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  // Selected IDs subject
  private selectedIdsSubject = new BehaviorSubject<number[]>([1, 2, 3]);
  readonly selectedIds$ = this.selectedIdsSubject.asObservable();

  // List of available products to add to comparison
  availableProducts$ = this.productService.getProducts(30, 0).pipe(
    map((res) => res.products)
  );

  addProductControl = new FormControl<number | null>(null);

  /**
   * Phase 8: Product Comparison using mergeMap.
   * Executes requests independently and in parallel, then gathers them with toArray().
   */
  readonly comparedProducts$ = this.selectedIds$.pipe(
    distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
    tap(() => this.loadingSubject.next(true)),
    switchMap((ids) => {
      if (ids.length === 0) {
        this.loadingSubject.next(false);
        return of([]);
      }

      return from(ids).pipe(
        // mergeMap executes HTTP calls in parallel for each product ID
        mergeMap((id) =>
          this.productService.getProductById(id).pipe(
            catchError((err) => {
              console.error(`Failed to load product ${id} for comparison:`, err);
              return of(null);
            })
          )
        ),
        // Filter out any failed product requests
        map((product) => product),
        toArray(),
        map((products) => products.filter((p): p is Product => p !== null)),
        finalize(() => this.loadingSubject.next(false))
      );
    })
  );

  ngOnInit(): void {
    // Read query params if routed from Products page ?ids=1,2,3
    this.route.queryParamMap
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((params) => {
        const idsStr = params.get('ids');
        if (idsStr) {
          const ids = idsStr
            .split(',')
            .map(Number)
            .filter((id) => !isNaN(id) && id > 0);
          if (ids.length > 0) {
            this.selectedIdsSubject.next(ids);
          }
        }
      });
  }

  addProduct(id: number | null): void {
    if (!id) return;
    const current = this.selectedIdsSubject.value;
    if (current.includes(id)) {
      this.notificationService.warning('Product already in comparison list');
      return;
    }
    if (current.length >= 4) {
      this.notificationService.warning('You can compare a maximum of 4 products at once');
      return;
    }
    this.selectedIdsSubject.next([...current, id]);
    this.addProductControl.reset();
  }

  removeProduct(id: number): void {
    const current = this.selectedIdsSubject.value;
    this.selectedIdsSubject.next(current.filter((item) => item !== id));
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product);
  }
}

