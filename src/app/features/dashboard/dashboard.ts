import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, forkJoin, merge, of, Subject, timer } from 'rxjs';
import {
  catchError,
  finalize,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { CategoryService } from '../../core/services/category';
import { ProductService } from '../../core/services/product';
import { UserService } from '../../core/services/user';
import { Product } from '../../models/product';

export interface DashboardStats {
  totalProducts: number;
  categoryCount: number;
  userCount: number;
  featuredProducts: Product[];
  lowStockCount: number;
  lastUpdated: Date;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    AsyncPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);

  // Phase 6: Loading & Error reactive state
  readonly loadingSubject = new BehaviorSubject<boolean>(true);
  readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  // Retry trigger stream
  private retrySubject = new Subject<void>();

  // Phase 7 & 23: forkJoin combined with timer polling (every 30s) and retry trigger
  readonly stats$ = merge(
    timer(0, 30000), // Poll every 30 seconds
    this.retrySubject
  ).pipe(
    tap(() => {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);
    }),
    // switchMap prevents overlapping API requests
    switchMap(() =>
      forkJoin({
        productData: this.productService.getProducts(8, 0),
        categories: this.categoryService.getCategories(),
        userCount: this.userService.getUsersTotal(),
      }).pipe(
        map(({ productData, categories, userCount }): DashboardStats => {
          const lowStockCount = productData.products.filter(
            (p) => p.stock < 20
          ).length;

          return {
            totalProducts: productData.total,
            categoryCount: categories.length,
            userCount,
            featuredProducts: productData.products,
            lowStockCount,
            lastUpdated: new Date(),
          };
        }),
        catchError((err) => {
          console.error('Failed to load dashboard data:', err);
          this.errorSubject.next('Failed to load dashboard data. Please try again.');
          return of(null);
        }),
        finalize(() => {
          this.loadingSubject.next(false);
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
    takeUntilDestroyed(this.destroyRef)
  );

  retry(): void {
    this.retrySubject.next();
  }
}
