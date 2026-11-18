import { Component } from '@angular/core';
import { Slider } from '../slider/slider';
import { ProductsList } from '../Product/product-list/product-list';

@Component({
  selector: 'app-home',
  imports: [Slider, ProductsList],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
