import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[scrollIntoView]',
})
export class ScrollIntoView {

  private el = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      this.el.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  }

}
