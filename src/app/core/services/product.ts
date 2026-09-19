import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable, of, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  map,
  mergeMap,
  retry,
  shareReplay,
  timeout,
  toArray,
} from 'rxjs/operators';
import {
  Product,
  ProductApiResponse,
  ProductFilterState,
} from '../../models/product';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://dummyjson.com/products';

  // Cache for product details by id to demonstrate shareReplay (Phase 18)
  private productCache = new Map<number, Observable<Product>>();

  getProducts(
    limit = 10,
    skip = 0,
    sortBy = '',
    order: 'asc' | 'desc' = 'asc'
  ): Observable<ProductApiResponse> {
    let url = `${this.baseUrl}?limit=${limit}&skip=${skip}`;
    if (sortBy) {
      url += `&sortBy=${encodeURIComponent(sortBy)}&order=${order}`;
    }

    return this.http.get<ProductApiResponse>(url).pipe(
      timeout(10000),
      retry({ count: 2, delay: 1000 })
    );
  }

  getProductById(id: number): Observable<Product> {
    if (!id || isNaN(id)) {
      return throwError(() => new Error('Invalid product ID'));
    }

    // Use shareReplay with bufferSize 1 and refCount true (Phase 18)
    if (!this.productCache.has(id)) {
      const request$ = this.http.get<Product>(`${this.baseUrl}/${id}`).pipe(
        timeout(10000),
        retry({ count: 2, delay: 1000 }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.productCache.set(id, request$);
    }

    return this.productCache.get(id)!;
  }

  searchProducts(
    query: string,
    limit = 10,
    skip = 0,
    sortBy = '',
    order: 'asc' | 'desc' = 'asc'
  ): Observable<ProductApiResponse> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getProducts(limit, skip, sortBy, order);
    }

    let url = `${this.baseUrl}/search?q=${encodeURIComponent(trimmed)}&limit=${limit}&skip=${skip}`;
    if (sortBy) {
      url += `&sortBy=${encodeURIComponent(sortBy)}&order=${order}`;
    }

    return this.http.get<ProductApiResponse>(url).pipe(
      timeout(10000),
      retry({ count: 2, delay: 1000 })
    );
  }

  getProductsByCategory(
    category: string,
    limit = 10,
    skip = 0,
    sortBy = '',
    order: 'asc' | 'desc' = 'asc'
  ): Observable<ProductApiResponse> {
    if (!category || category === 'all') {
      return this.getProducts(limit, skip, sortBy, order);
    }

    let url = `${this.baseUrl}/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`;
    if (sortBy) {
      url += `&sortBy=${encodeURIComponent(sortBy)}&order=${order}`;
    }

    return this.http.get<ProductApiResponse>(url).pipe(
      timeout(10000),
      retry({ count: 2, delay: 1000 })
    );
  }

  /**
   * Phase 5: Combines search, category, sort, and pagination into official DummyJSON endpoints.
   * NOTE: DummyJSON does not provide a single endpoint that filters by category AND search query simultaneously.
   * When both category and search query are active, we query the category endpoint and filter results by search query client-side,
   * while preserving server-side pagination whenever only one filter is active.
   */
  queryProducts(filter: ProductFilterState): Observable<ProductApiResponse> {
    const { search, category, sortBy, order, pageIndex, pageSize } = filter;
    const skip = pageIndex * pageSize;
    const hasCategory = category && category !== 'all';
    const hasSearch = !!search && search.trim().length > 0;

    if (hasCategory && hasSearch) {
      // Combined category + search: fetch category items and filter by search term
      return this.http
        .get<ProductApiResponse>(
          `${this.baseUrl}/category/${encodeURIComponent(category)}?limit=100`
        )
        .pipe(
          map((res) => {
            const query = search.toLowerCase().trim();
            const matched = res.products.filter(
              (p) =>
                p.title.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query)
            );
            return {
              products: matched.slice(skip, skip + pageSize),
              total: matched.length,
              skip,
              limit: pageSize,
            };
          }),
          timeout(10000),
          retry({ count: 2, delay: 1000 })
        );
    }

    if (hasCategory) {
      return this.getProductsByCategory(category, pageSize, skip, sortBy, order);
    }

    if (hasSearch) {
      return this.searchProducts(search, pageSize, skip, sortBy, order);
    }

    return this.getProducts(pageSize, skip, sortBy, order);
  }

  /**
   * Phase 8: Product Comparison using mergeMap (runs parallel independent requests)
   */
  compareProducts(ids: number[]): Observable<Product[]> {
    if (!ids || ids.length === 0) {
      return of([]);
    }

    return from(ids).pipe(
      mergeMap((id) => this.getProductById(id)),
      toArray()
    );
  }

  /**
   * Phase 9: Sequential bulk update using concatMap (maintains order of operations)
   */
  bulkUpdateProducts(
    updates: { id: number; changes: Partial<Product> }[]
  ): Observable<Product[]> {
    if (!updates || updates.length === 0) {
      return of([]);
    }

    return from(updates).pipe(
      concatMap((item) => this.updateProduct(item.id, item.changes)),
      toArray()
    );
  }

  updateProduct(id: number, changes: Partial<Product>): Observable<Product> {
    return this.http
      .put<Product>(`${this.baseUrl}/${id}`, changes)
      .pipe(timeout(10000));
  }
}

