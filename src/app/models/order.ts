export interface OrderItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  thumbnail: string;
}

export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: 'Pending' | 'Processing' | 'Completed';
  shippingAddress: ShippingAddress;
}

