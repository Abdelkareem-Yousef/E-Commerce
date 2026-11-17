export interface Product {
  _id: string;
  name: string;
  price: number;
  image: { secure_url: string; public_id?: string };
  stock: number;
}