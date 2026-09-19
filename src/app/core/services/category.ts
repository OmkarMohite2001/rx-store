import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://dummyjson.com/products/category-list';

  readonly categories$: Observable<string[]> = this.http
    .get<string[]>(this.apiUrl)
    .pipe(
      shareReplay({
        bufferSize: 1,
        refCount: true,
      })
    );

  getCategories(): Observable<string[]> {
    return this.categories$;
  }
}

