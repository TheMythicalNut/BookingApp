import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../../pipes/translate-pipe';

@Component({
  selector: 'reservation-post-review',
  imports: [TranslatePipe],
  templateUrl: './post-review.html',
  styleUrl: './post-review.css',
})
export class PostReview {
  readonly rating = input<number>(0);
  readonly isOpen = input<boolean>(false);
  
  close = output<void>();
  requestMaps = output<void>();

  onBackdropClick() {
    this.close.emit();
  }

  toMaps(){
    this.requestMaps.emit();
  }

}
