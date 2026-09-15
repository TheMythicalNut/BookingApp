import { Component, computed, inject, input } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { UpperCasePipe } from '@angular/common';
import { Category, Service } from '../../../../models/models';

@Component({
  selector: 'studio-list-services',
  imports: [UpperCasePipe],
  templateUrl: './list-services.html',
  styleUrl: './list-services.css',
})
export class ListServices {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  readonly studio = this.singleProvider.activeStudio;
  readonly services = this.singleProvider.activeStudioServices;

  serviceWidth = input<number>()

  getCategories = computed<Category[]>(()=>{
    const studio = this.studio();
    if(!studio) return [];
    return studio.categories;
  })

  getCategoryServices(cat: Category): Service[] {
    return this.services().filter(it => cat.services.includes(it.id))
  }
  
  getServiceTypeName(type: string[]){
    return this.translate.getServiceTypeName(type);
  }

  onService(id: string){
    this.singleProvider.select('service', id);
  }
}
