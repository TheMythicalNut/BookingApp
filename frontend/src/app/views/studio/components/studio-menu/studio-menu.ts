import { Component, computed, effect, ElementRef, inject, input, output, signal, ViewChild } from '@angular/core';
import { TextInput } from "../../../../components/common/text-input/text-input";
import { UpperCasePipe } from '@angular/common';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { Package } from '../../../../models/models';

@Component({
  selector: 'studio-menu',
  imports: [TextInput, UpperCasePipe],
  templateUrl: './studio-menu.html',
  styleUrl: './studio-menu.css'
})
export class StudioMenu {
  @ViewChild('searchPanel', { static: false }) panel!: ElementRef<HTMLElement>;

  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);

  readonly isOpen = input(false);
  readonly close = output<void>();
  readonly onService = output<string>();
  readonly onPackage = output<string>();

  readonly search = signal('');

  searchChange(newValue: string) {
    this.search.set(newValue);
  }
  
  readonly searchPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.SEARCH');
  })

  readonly categories = computed(()=>{
    const studio = this.singleProvider.activeStudio()
    return studio?.categories ?? [];
  }) 
  readonly services = computed(()=>{
    const services = this.singleProvider.activeServices()
    return services ?? [];
  })
  readonly packages = computed(()=>{
    const packages = this.singleProvider.activePackages();
    return packages ?? [];
  })

  readonly packageCount = computed(()=>{
    const packages = this.packages()
    return packages.length;
  })
  
  readonly filteredPackages = computed(()=>{
    const search = this.search();
    const packages = this.packages();
    const lcSearch = search.toLowerCase();
    const list: Package[] = [];
    for(let pkg of packages){
      if(
        pkg.duration.toString().toLowerCase().includes(lcSearch) ||
        pkg.description.toLowerCase().includes(lcSearch) ||
        pkg.name.toLowerCase().includes(lcSearch) ||
        pkg.price.toLowerCase().includes(lcSearch)
      ) list.push(pkg)
    }
    return list;

  })

  readonly filteredServices = computed(()=>{
    const search = this.search();
    const services = this.services();
    const lcSearch = search.toLowerCase();

    return (ids: string[])=>{
      const list: string[] = []
      for(let service of services.filter(it => ids.includes(it.id))){
        if(
        service.duration.toString().toLowerCase().includes(lcSearch) ||
        service.description.toLowerCase().includes(lcSearch) ||
        service.name.toLowerCase().includes(lcSearch) || 
        service.price.toLowerCase().includes(lcSearch) ||
        this.translate.getServiceTypeName(service.type).toLowerCase().includes(lcSearch)
        ) list.push(service.id);
      }
      return list;
    }
  })

  dropped : boolean[] = []

  constructor(){
    effect(()=>{
      const categories = this.categories();
      if(categories){
        this.dropped = new Array(categories.length + 1).fill(false);
      }
    })
  }
  
  onBackdropClick() {
    this.close.emit();
  }


  totalDelay(n: number): number {
    // 300, 200, 150, 125, 112.5 …  (halves the step each time after the first)
    if (n <= 0) return 0;
    let sum = 300;          // initial time
    let step = 200;         // initial step
    for (let i = 2; i <= n; i++) {
      step /= 2;            // 200 → 100 → 50 → 25 …
      sum += step;
    }
    return Math.round(sum); // whole milliseconds
  }

  getServiceTypeName(type: string[]): string {
    return this.translate.getServiceTypeName(type, '\u00A0•\u00A0');
  }

  get getPackageTypeName(): string {
    return this.translate.translate('PACKAGE_TYPE');
  }

}
