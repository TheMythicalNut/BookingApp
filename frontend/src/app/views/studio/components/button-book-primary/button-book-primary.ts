import { UpperCasePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';

@Component({
  selector: 'studio-button-book-primary',
  imports: [UpperCasePipe],
  templateUrl: './button-book-primary.html',
  styleUrl: './button-book-primary.css',
})
export class ButtonBookPrimary {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  studio = this.singleProvider.activeStudio;
  services = this.singleProvider.activeStudioServices;

  hasPrimary = computed<boolean>(()=>{
    const services = this.services();
    return !!services.length;
  })

  getPrimaryText = computed<string>(()=>{
    const services = this.services();
    if(!services.length || !services[0].type.length) return '';
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.BOOK') + ' ' + this.translate.getServiceTypeName([services[0].type[0]]);
  })

  onPrimary(){
    this.singleProvider.select('service', this.services()[0].id);
  }

}
