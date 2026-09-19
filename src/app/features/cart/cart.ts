import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart';
import { Product } from '../../models/product';

@Component({
  selector: 'app-cart',
  imports: [
    AsyncPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    RouterLink,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  protected cartService = inject(CartService);

  readonly items$ = this.cartService.items$;
  readonly cartTotal$ = this.cartService.cartTotal$;
  readonly cartCount$ = this.cartService.cartCount$;
  readonly isEmpty$ = this.cartService.isEmpty$;
  readonly hasItems$ = this.cartService.hasItems$;
  readonly totalDifference$ = this.cartService.totalDifference$;

  increase(productId: number): void {
    this.cartService.increaseQuantity(productId);
  }

  decrease(productId: number): void {
    this.cartService.decreaseQuantity(productId);
  }

  remove(productId: number): void {
    this.cartService.removeFromCart(productId);
  }

  clear(): void {
    this.cartService.clearCart();
  }
}
