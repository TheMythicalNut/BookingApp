import { Component, computed, inject, Input, input, output } from '@angular/core';
import { TranslatePipe } from '../../../../pipes/translate-pipe';
import { UpperCasePipe } from '@angular/common';
import { Binary } from '../../../../models/models';
import { TranslationService } from '../../../../services/translation/translation';

@Component({
  selector: 'app-two-state-button',
  imports: [UpperCasePipe],
  templateUrl: './two-state-button.html',
  styleUrl: './two-state-button.css',
})
export class TwoStateButton {
  private readonly translate = inject(TranslationService);
  readonly value = input<Binary>();
  readonly valueChange = output<Binary>();
  readonly isActive0 = computed(() => this.value() === 0);
  readonly isActive1 = computed(() => this.value() === 1);

  readonly getStudiosText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('STUDIOS');
  });
  readonly getServicesText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SERVICES');
  });
  setValue(id: Binary): void {
    this.valueChange.emit(id);
  }
}
