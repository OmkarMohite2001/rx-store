import { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  totalAmount: number;
  totalCount: number;
}

