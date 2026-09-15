
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation/translation';
@Pipe({
  name: 'translate',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private translate: TranslationService = inject(TranslationService)
  constructor() {}

  transform(value: string, params?: { [key: string]: string }): string {
    return this.translate.translate(value, params);
  }

}
