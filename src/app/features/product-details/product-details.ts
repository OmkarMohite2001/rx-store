import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product-service';
import { map, switchMap } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-product-details',
  imports: [AsyncPipe,MatCardModule,RouterLink],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetails {
  private route =
    inject(ActivatedRoute);

  private productService =
    inject(ProductService);


  product$ =
    this.route.paramMap.pipe(

      map(params => {

        const id =
          params.get('id');

        if (!id) {
          throw new Error(
            'Product ID not found'
          );
        }

        return Number(id);

      }),

      switchMap(id =>
        this.productService
          .getProductById(id)
      )

    );
}
