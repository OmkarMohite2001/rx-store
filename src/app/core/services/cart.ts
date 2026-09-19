import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map, pairwise, startWith } from 'rxjs/operators';
import { CartItem, CartState } from '../../models/cart';
import { Product } from '../../models/product';
import { NotificationService } from './notification';

const CART_STORAGE_KEY = 'rx_store_cart';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private notificationService = inject(NotificationService);

  private cartSubject: BehaviorSubject<CartState>;
  readonly cart$: Observable<CartState>;

  // Derived state selectors
  readonly items$: Observable<CartItem[]>;
  readonly cartCount$: Observable<number>;
  readonly cartTotal$: Observable<number>;
  readonly isEmpty$: Observable<boolean>;
  readonly hasItems$: Observable<boolean>;

  // Advanced operator demonstration (Phase 20 pairwise): tracks previous vs current total
  readonly totalDifference$: Observable<{ previous: number; current: number; difference: number }>;

  constructor() {
    const initialState = this.loadCart();
    this.cartSubject = new BehaviorSubject<CartState>(initialState);
    this.cart$ = this.cartSubject.asObservable();

    this.items$ = this.cart$.pipe(
      map((state) => state.items),
      distinctUntilChanged()
    );

    this.cartCount$ = this.cart$.pipe(
      map((state) => state.totalCount),
      distinctUntilChanged()
    );

    this.cartTotal$ = this.cart$.pipe(
      map((state) => state.totalAmount),
      distinctUntilChanged()
    );

    this.isEmpty$ = this.cartCount$.pipe(
      map((count) => count === 0),
      distinctUntilChanged()
    );

    this.hasItems$ = this.isEmpty$.pipe(
      map((empty) => !empty),
      distinctUntilChanged()
    );

    this.totalDifference$ = this.cartTotal$.pipe(
      startWith(0),
      pairwise(),
      map(([prev, curr]) => ({
        previous: prev,
        current: curr,
        difference: curr - prev,
      }))
    );
  }

  addToCart(product: Product, quantity = 1): void {
    if (quantity <= 0) return;

    const currentItems = this.cartSubject.value.items;
    const existingIndex = currentItems.findIndex((item) => item.product.id === product.id);

    let updatedItems: CartItem[];
    if (existingIndex >= 0) {
      updatedItems = currentItems.map((item, index) =>
        index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
      );
    } else {
      updatedItems = [...currentItems, { product, quantity }];
    }

    this.updateCart(updatedItems);
    this.notificationService.success(`Added "${product.title}" to cart`);
  }

  removeFromCart(productId: number): void {
    const currentItems = this.cartSubject.value.items;
    const removedItem = currentItems.find((item) => item.product.id === productId);
    const updatedItems = currentItems.filter((item) => item.product.id !== productId);
    this.updateCart(updatedItems);

    if (removedItem) {
      this.notificationService.info(`Removed "${removedItem.product.title}" from cart`);
    }
  }

  increaseQuantity(productId: number): void {
    const currentItems = this.cartSubject.value.items;
    const updatedItems = currentItems.map((item) =>
      item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    );
    this.updateCart(updatedItems);
  }

  decreaseQuantity(productId: number): void {
    const currentItems = this.cartSubject.value.items;
    const item = currentItems.find((i) => i.product.id === productId);
    if (!item) return;

    if (item.quantity <= 1) {
      this.removeFromCart(productId);
    } else {
      const updatedItems = currentItems.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
      );
      this.updateCart(updatedItems);
    }
  }

  clearCart(): void {
    this.updateCart([]);
    this.notificationService.info('Cart cleared');
  }

  private updateCart(items: CartItem[]): void {
    const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalAmount = Math.round(
      items.reduce((acc, item) => acc + item.product.price * item.quantity, 0) * 100
    ) / 100;

    const newState: CartState = {
      items,
      totalCount,
      totalAmount,
    };

    this.cartSubject.next(newState);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // storage quota handling
    }
  }

  private loadCart(): CartState {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as CartState;
      }
    } catch {
      // ignore JSON parse error
    }

    return {
      items: [],
      totalAmount: 0,
      totalCount: 0,
    };
  }
}

