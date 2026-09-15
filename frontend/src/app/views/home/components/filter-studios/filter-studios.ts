import { Component, computed, inject, input } from '@angular/core';
import { UserProvider } from '../../../../services/user/user';
import { TranslationService } from '../../../../services/translation/translation';
import { STUDIO_TYPES } from '../../../../CONST';
import { TextInput } from "../../../../components/common/text-input/text-input";

@Component({
  selector: 'app-filter-studios',
  imports: [TextInput],
  templateUrl: './filter-studios.html',
  styleUrl: './filter-studios.css',
})
export class FilterStudios {
  private readonly user = inject(UserProvider);
  private readonly translate = inject(TranslationService);
  readonly active = input<boolean>();
  readonly expanded = input<boolean>();
  readonly studioTypes = Object.keys(STUDIO_TYPES);

  readonly search = computed<string>(()=>{
    const filters = this.user.filters();
    return filters.search ?? '';
  })

  readonly searchPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.SEARCH');
  })


  readonly type = computed<string>(()=>{
    const filters = this.user.filters();
    return filters.studioType ?? '';
  })

  readonly getTypeName = computed<string>(()=>{
    const type = this.type();
    if(type === '') return '';
    return this.translate.getStudioTypeName([type]);
  })

  getStudioType(id: string): string {
    return this.translate.getStudioTypeName([id]);
  }
  
  readonly isSelectedType = computed(()=>{
    const type = this.type();
    if(type === '') return (match : string)=>false;
    return (match: string) => type === match;
  })

  selectType(type: string) {
    const curType = this.type();
    if(type === curType)
      this.user.setStudioType('');
    else
      this.user.setStudioType(type);
  }
  
  searchChange(newValue: string) {
    this.user.setSearch(newValue);
  }
}
