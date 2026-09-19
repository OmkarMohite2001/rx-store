import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { concatMap, delay, map, tap } from 'rxjs/operators';
import { CartItem } from '../../models/cart';
import { Order, OrderItem, ShippingAddress } from '../../models/order';
import { CartService } from './cart';
import { NotificationService } from './notification';

const ORDERS_STORAGE_KEY = 'rx_store_orders';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);

  private ordersSubject: BehaviorSubject<Order[]>;
  readonly orders$: Observable<Order[]>;

  constructor() {
    this.ordersSubject = new BehaviorSubject<Order[]>(this.loadOrders());
    this.orders$ = this.ordersSubject.asObservable();
  }

  createOrder(
    userId: number,
    items: CartItem[],
    shippingAddress: ShippingAddress
  ): Observable<Order> {
    if (items.length === 0) {
      return throwError(() => new Error('Cannot create an order with an empty cart'));
    }

    const orderPayload = {
      userId,
      products: items.map((i) => ({
        id: i.product.id,
        quantity: i.quantity,
      })),
    };

    // Sequential checkout pipeline using concatMap:
    // Step 1: Submit to DummyJSON cart endpoint
    // Step 2: Concat to local order finalizing step
    return this.http
      .post('https://dummyjson.com/carts/add', orderPayload)
      .pipe(
        concatMap((apiResponse: any) => {
          // Process order record creation
          const orderItems: OrderItem[] = items.map((i) => ({
            productId: i.product.id,
            title: i.product.title,
            price: i.product.price,
            quantity: i.quantity,
            thumbnail: i.product.thumbnail,
          }));

          const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

          const newOrder: Order = {
            id: `ORD-${Date.now().toString().slice(-6)}`,
            items: orderItems,
            total: Math.round(total * 100) / 100,
            date: new Date().toISOString(),
            status: 'Completed',
            shippingAddress,
          };

          return of(newOrder).pipe(delay(300));
        }),
        tap((completedOrder) => {
          this.addOrder(completedOrder);
          this.cartService.clearCart();
          this.notificationService.success(`Order #${completedOrder.id} placed successfully!`);
        })
      );
  }

  private addOrder(order: Order): void {
    const updated = [order, ...this.ordersSubject.value];
    this.ordersSubject.next(updated);
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage quota handling
    }
  }

  private loadOrders(): Order[] {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Order[];
      }
    } catch {
      // ignore
    }
    return [];
  }
}
