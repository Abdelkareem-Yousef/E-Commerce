import { Component, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Slider } from '../slider/slider';
import {ProductsList} from '../Product/product-list/product-list';
import { ProductCard } from '../Product/product-card/product-card';
import { Product } from '../Product/product-card/product.model';

@Component({
  selector: 'app-home',
  imports: [Slider,ProductsList],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  products: Product[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
  }

}
