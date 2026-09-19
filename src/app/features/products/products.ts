import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  from,
  merge,
  of,
  Subject,
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
  toArray,
} from 'rxjs/operators';
import { CartService } from '../../core/services/cart';
import { CategoryService } from '../../core/services/category';
import { NotificationService } from '../../core/services/notification';
import { ProductService } from '../../core/services/product';
import { Product, ProductFilterState } from '../../models/product';

@Component({
  selector: 'app-products',
  imports: [
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Form Controls
  searchControl = new FormControl('', { nonNullable: true });
  categoryControl = new FormControl('all', { nonNullable: true });
  sortControl = new FormControl('default', { nonNullable: true });

  // Pagination Subjects
  pageIndexSubject = new BehaviorSubject<number>(0);
  pageSizeSubject = new BehaviorSubject<number>(12);
  totalProductsSubject = new BehaviorSubject<number>(0);

  // Loading & Error Subjects (Phase 6)
  loadingSubject = new BehaviorSubject<boolean>(true);
  errorSubject = new BehaviorSubject<string | null>(null);
  retrySubject = new Subject<number>();

  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly totalProducts$ = this.totalProductsSubject.asObservable();
  readonly pageIndex$ = this.pageIndexSubject.asObservable();
  readonly pageSize$ = this.pageSizeSubject.asObservable();

  // Phase 4: Categories stream loaded from API and cached with shareReplay
  categories$ = this.categoryService.getCategories();

  // Selection state for Phase 8 (Compare) and Phase 9 (concatMap Bulk update)
  selectedProductIds = signal<number[]>([]);
  isBulkUpdating = signal<boolean>(false);
  bulkProgress = signal<string>('');

  // Phase 5: Reactive filter state combining search$, category$, sort$, page$
  private search$ = this.searchControl.valueChanges.pipe(
    startWith(''),
    debounceTime(500),
    map((value) => value.trim()),
    distinctUntilChanged()
  );

  private category$ = this.categoryControl.valueChanges.pipe(
    startWith('all'),
    distinctUntilChanged()
  );

  private sort$ = this.sortControl.valueChanges.pipe(
    startWith('default'),
    distinctUntilChanged()
  );

  readonly products$ = combineLatest({
    search: this.search$,
    category: this.category$,
    sort: this.sort$,
    pageIndex: this.pageIndexSubject,
    pageSize: this.pageSizeSubject,
    retry: this.retrySubject.pipe(startWith(0)),
  }).pipe(
    map(({ search, category, sort, pageIndex, pageSize }): ProductFilterState => {
      let sortBy = '';
      let order: 'asc' | 'desc' = 'asc';

      if (sort === 'price-asc') {
        sortBy = 'price';
        order = 'asc';
      } else if (sort === 'price-desc') {
        sortBy = 'price';
        order = 'desc';
      } else if (sort === 'rating-desc') {
        sortBy = 'rating';
        order = 'desc';
      } else if (sort === 'title-asc') {
        sortBy = 'title';
        order = 'asc';
      }

      return {
        search,
        category,
        sortBy,
        order,
        pageIndex,
        pageSize,
      };
    }),
    tap(() => {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    switchMap((filter) =>
      this.productService.queryProducts(filter).pipe(
        tap((response) => {
          this.totalProductsSubject.next(response.total);
        }),
        map((response) => response.products),
        catchError((err) => {
          console.error('Failed to load products:', err);
          this.errorSubject.next(
            'Unable to load products. Please check your network connection.'
          );
          return of([]);
        }),
        finalize(() => {
          this.loadingSubject.next(false);
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    // Reset pagination to first page when search, category, or sort changes
    merge(
      this.searchControl.valueChanges,
      this.categoryControl.valueChanges,
      this.sortControl.valueChanges
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.pageIndexSubject.value !== 0) {
          this.pageIndexSubject.next(0);
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSizeSubject.next(event.pageSize);
    this.pageIndexSubject.next(event.pageIndex);
  }

  retry(): void {
    this.retrySubject.next(Date.now());
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product);
  }

  toggleSelection(productId: number): void {
    const current = this.selectedProductIds();
    if (current.includes(productId)) {
      this.selectedProductIds.set(current.filter((id) => id !== productId));
    } else {
      this.selectedProductIds.set([...current, productId]);
    }
  }

  isSelected(productId: number): boolean {
    return this.selectedProductIds().includes(productId);
  }

  clearSelection(): void {
    this.selectedProductIds.set([]);
  }

  goToCompare(): void {
    const ids = this.selectedProductIds();
    if (ids.length < 2) {
      this.notificationService.warning('Please select at least 2 products to compare');
      return;
    }
    this.router.navigate(['/compare'], {
      queryParams: { ids: ids.join(',') },
    });
  }

  /**
   * Phase 9: Sequential bulk update using concatMap.
   * Executes updates one by one to preserve strict order of execution.
   */
  applyBulkDiscount(): void {
    const ids = this.selectedProductIds();
    if (ids.length === 0) return;

    this.isBulkUpdating.set(true);
    let count = 0;

    from(ids)
      .pipe(
        concatMap((id) => {
          count++;
          this.bulkProgress.set(`Updating item ${count} of ${ids.length}...`);
          return this.productService.updateProduct(id, { discountPercentage: 15 });
        }),
        toArray(),
        finalize(() => {
          this.isBulkUpdating.set(false);
          this.bulkProgress.set('');
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updatedProducts) => {
          this.notificationService.success(
            `Successfully applied bulk discount to ${updatedProducts.length} products!`
          );
          this.clearSelection();
          this.retry();
        },
        error: (err) => {
          this.notificationService.error('Bulk update failed. Please try again.');
        },
      });
  }
}
