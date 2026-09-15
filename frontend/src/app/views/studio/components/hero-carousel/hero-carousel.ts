import { Component, ElementRef, input, signal, ViewChild } from '@angular/core';

@Component({
  selector: 'studio-hero-carousel',
  imports: [],
  templateUrl: './hero-carousel.html',
  styleUrl: './hero-carousel.css',
})
export class HeroCarousel {
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef<HTMLDivElement>;

  readonly images = input<string[]>([]);
  readonly height = input<number>();
  readonly index= signal(0);

  onScroll(){
    this.updateIndex();
  }
  scrollTo(index: number){
    const container = this.scrollContainer.nativeElement;
    const child = container.children[index] as HTMLElement;
    child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest'});
  }

  private updateIndex() {
    const container = this.scrollContainer.nativeElement;
    const containerCenter =
      container.scrollLeft + container.clientWidth / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    Array.from(container.children).forEach((child, index) => {
      const el = child as HTMLElement;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(containerCenter - elCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    this.index.set(closestIndex);
  }

}
