import { Component, inject } from '@angular/core';
import { ProductService } from '../../core/services/product-service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AsyncPipe } from '@angular/common';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-products',
  imports: [
    AsyncPipe,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  private productService = inject(ProductService);

  searchControl = new FormControl('', { nonNullable: true });

  products$ = this.searchControl.valueChanges.pipe(
    startWith(''),

    debounceTime(500),

    map((value) => value.trim()),

    distinctUntilChanged(),

    switchMap((searchTerm) => {
      if (!searchTerm) {
        return this.productService.getProducts();
      }

      return this.productService
        .searchProducts(searchTerm)
        .pipe(map((response) => response.products));
    }),

    catchError((error) => {
      console.error('Product search failed:', error);

      return of([]);
    }),
  );
}
