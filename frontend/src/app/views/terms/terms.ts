import { Component, computed, effect, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate-pipe';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { TranslationService } from '../../services/translation/translation';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TextInput } from "../../components/common/text-input/text-input";

export interface TERM {
  HEADER: string;
  BODY: string;
  headerLower: string;
  bodyLower: string;
}

@Component({
  selector: 'app-terms',
  imports: [FormsModule, TextInput],
  templateUrl: './terms.html',
  styleUrl: './terms.css',
})
export class Terms {
  private translate: TranslationService = inject(TranslationService);

  TOS: TERM[] = []
  filteredTOS : TERM[]= []

  readonly search = signal('');

  readonly getTOSTitle = computed(()=>{
    const _ = this.translate.userLang()
    return this.translate.translate('TOS.TITLE');
  });
  
  searchChange(newValue: string) {
    this.search.set(newValue);
  }

  readonly searchPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.SEARCH');
  })

  constructor(){
    effect(()=>{
      const lang = this.translate.userLang();
      const tos = this.translate.translate<TERM[]>('TOS.TERMS');
      
      this.TOS = tos.map(t => ({
        ...t,
        headerLower: t.HEADER.toLowerCase(),
        bodyLower: t.BODY.toLowerCase()
      }));

      this.filteredTOS = this.TOS;
    });
    effect(()=>{
      const query = this.search();

      const value = query.trim().toLowerCase();
      if(!value){ 
        this.filteredTOS = this.TOS;
        return;
      }
      
      this.filteredTOS = this.TOS.filter(t => (
        t.headerLower.includes(value) ||
        t.bodyLower.includes(value)
      ))
    })
  }
}
