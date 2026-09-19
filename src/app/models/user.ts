export interface UserAddress {
  address: string;
  city: string;
  postalCode: string;
  state?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  image?: string;
  address?: UserAddress;
}

export interface UsersApiResponse {
  users: UserProfile[];
  total: number;
  skip: number;
  limit: number;
}

