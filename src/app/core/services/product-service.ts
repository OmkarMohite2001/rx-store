import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Product } from '../../models/product';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://dummyjson.com/products';

  getProducts(): Observable<Product[]> {
    return this.http
      .get<ProductApiResponse>(this.apiUrl)
      .pipe(map((response) => response.products));
  }
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }
  searchProducts(searchTerm: string): Observable<ProductApiResponse> {
    return this.http.get<ProductApiResponse>(
      `${this.apiUrl}/search?q=${encodeURIComponent(searchTerm)}`,
    );
  }
}

export interface ProductApiResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}
