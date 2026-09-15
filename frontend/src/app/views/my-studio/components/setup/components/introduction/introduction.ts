import { Component, computed, inject, output } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupState } from '../../../../../../models/models';
import { Button } from "../../../../../../components/common/button/button";

@Component({
  selector: 'setup-introduction',
  imports: [Button],
  templateUrl: './introduction.html',
  styleUrl: './introduction.css',
})
export class Introduction {
  private readonly translate = inject(TranslationService);
  readonly select = output<SetupState>();

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */

  onSelect(value: SetupState) {
    this.select.emit(value);
  }
  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);
  
  readonly title = computed(()=>{
    this.lang();
    return this.tr('SETUP.INTRO.TITLE');
  })
  
  readonly par1 = computed(()=>{
    this.lang();
    return this.tr('SETUP.INTRO.PAR1');
  })

  readonly par2 = computed(()=>{
    this.lang();
    return this.tr('SETUP.INTRO.PAR2');
  })
  
  readonly par3 = computed(()=>{
    this.lang();
    return this.tr('SETUP.INTRO.PAR3');
  })
  
  readonly startLabel = computed(()=>{
    this.lang();
    return this.tr('SETUP.INTRO.BUTTON');
  })
}
