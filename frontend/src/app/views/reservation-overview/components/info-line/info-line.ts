import { Component, input } from '@angular/core';

@Component({
  selector: 'reservation-info-line',
  imports: [],
  templateUrl: './info-line.html',
  styleUrl: './info-line.css',
})
export class InfoLine {
  isLink = input<boolean>(false);
  left = input<string>('');
  right = input<string>('');
  constructor() {}
}
