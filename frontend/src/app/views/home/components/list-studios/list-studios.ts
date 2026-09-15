import { Component, computed, effect, HostListener, inject, input, signal, ViewChild, viewChild } from '@angular/core';
import { UnifiedListProvider } from '../../../../services/unified/unified-list-provider';
import { UpperCasePipe } from '@angular/common';
import { TranslationService } from '../../../../services/translation/translation';
import { NgxMasonryComponent, NgxMasonryModule, NgxMasonryOptions } from 'ngx-masonry';
import { Studio } from '../../../../models/models';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { Spinner } from "../../../../components/common/spinner/spinner";

@Component({
  selector: 'app-list-studios',
  imports: [UpperCasePipe, NgxMasonryModule, Spinner],
  templateUrl: './list-studios.html',
  styleUrl: './list-studios.css'
})
export class ListStudios {
  @ViewChild(NgxMasonryComponent)
  private masonry?: NgxMasonryComponent;
  private readonly listProivder = inject(UnifiedListProvider);
  private readonly singleSetter = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  
  readonly innerWidth = signal(window.innerWidth);
  readonly defaultWidth = 412;
  private readonly adv = 0.5;
 
  readonly active = input<boolean>();

  readonly loading = this.listProivder.loading;
  readonly studios = this.listProivder.filteredStudios;

  private readonly fillerCount = 10;
  private readonly fillers = computed<{real: false, id: string}[]>(() =>
    Array.from({ length: this.fillerCount }, (_, i) => ({ real: false, id: `filler-${i}` }))
  );

  readonly masonryItems = computed<({real: false, id: string} | Studio & {real: true})[]>
  (() => {
    const realItems: (Studio & { real: true })[] = this.studios().map(studio => ({ real: true, ...studio }));
    return [...realItems, ...this.fillers()];
  });

  getArticleHeight(score: number): number {
    const iw = this.innerWidth()
    let div;
    let rem;
    if(iw < 600) {div = 2;rem=8;}
    else if(iw > 768) {div = 4; rem=12;}
    else {div=3; rem=32/3;}
    return (1 + score * this.adv) * (iw / div - rem);
  }

  private resizeRaf?: number;
  @HostListener('window:resize')
  onResize() {
    this.innerWidth.set(window.innerWidth);
  }

  constructor(){
    this.innerWidth.set(window.innerWidth);

    setTimeout(()=>{
      this.masonry?.reloadItems();
      this.masonry?.layout();
    }, 200);

    effect(() => {
      this.innerWidth(); // dependency

      if (!this.masonry) return;

      cancelAnimationFrame(this.resizeRaf!);

      this.resizeRaf = requestAnimationFrame(() => {
        window.location.reload();
      });
    });

    effect(() => {
      const studios = this.studios();
      
      if(!studios.length || !this.masonry) return;

      queueMicrotask(()=> {
        this.masonry?.reloadItems();
        this.masonry?.layout();
      })
    })
  }

  reloadLayout(): void {
    requestAnimationFrame(()=>{
      this.masonry?.layout();
    })
  }

  // Track by function for performance
  trackByStudio(index: number, studio: { real: boolean, id: string } | Studio & { real: boolean } ): string {
    return studio.id ?? index;
  }

  selectStudio(identifier: string){
    this.singleSetter.select('studio', identifier, false);
  }

  readonly getTypeName = computed(()=>{
    const _ = this.translate.userLang();
    return (type: string[]) => this.translate.getStudioTypeName(type); 
  })

  masonryOptions: NgxMasonryOptions = {
    gutter: 16,
    horizontalOrder: true,
    originLeft: true,
    fitWidth: true,
    percentPosition: true,
    columnWidth: '.article-container'
  };

  readonly fillerItems = computed(() => {
    const count = this.studios().length;
    return count < 6 ? Array.from({ length: 6 - count }, (_, i) => i) : [];
  });
}
