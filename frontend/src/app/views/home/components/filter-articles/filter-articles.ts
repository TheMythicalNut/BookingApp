import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { UserProvider } from '../../../../services/user/user';
import { TranslationService } from '../../../../services/translation/translation';
import { SERVICE_TYPES } from '../../../../CONST';
import { TextInput } from '../../../../components/common/text-input/text-input';
import { UnifiedListProvider } from '../../../../services/unified/unified-list-provider';

@Component({
  selector: 'app-filter-articles',
  imports: [TextInput],
  templateUrl: './filter-articles.html',
  styleUrls: ['./filter-articles.css'],
})
export class FilterArticles {
  private readonly listProvider = inject(UnifiedListProvider);
  private readonly user = inject(UserProvider);
  private readonly translate = inject(TranslationService);
  readonly active = input<boolean>();
  readonly expanded = input<boolean>();

  readonly openDatePicker = output<void>();
  
  readonly serviceTypes = Object.keys(SERVICE_TYPES);

  readonly availableLocations = this.listProvider.availableLocations();

  readonly availableLocationsStr = computed<string[]>(()=>{
    const al = this.listProvider.availableLocations(); 
    return al.map(it => (it.city ? `${it.city}, ${it.country}` : it.country))
  });
  
  readonly availableTypes = Object.keys(SERVICE_TYPES);

  private readonly monthNames = this.translate.monthNames;
  
  readonly locationPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.LOCATION');
  })
  
  readonly typePlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.SERVICE_TYPE');
  })
  
  readonly timeslotPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.TIMESLOT');
  })

  readonly dropdownTypes = computed<string[]>(()=>{
    const lang = this.translate.userLang();
    return this.availableTypes.map(it => this.translate.getServiceTypeName([it]));
  })

  readonly expandAnim = signal<boolean>(false);
  private timeoutId?: ReturnType<typeof setTimeout>;
  constructor(){
    effect(()=>{
      const _ = this.expanded();
      
      this.expandAnim.set(true);

      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        this.expandAnim.set(false);
      }, 500);
      
      return () => clearTimeout(this.timeoutId);
    })
  }


  readonly location = computed<string>(()=>{
    const location = this.user.filters().location;
    if(!location) return '';
    return location.city ? location.city + ', ' + location.country : location.country;
  })

  readonly type = computed<string>(()=>{
    const type = this.user.filters().serviceType;
    if(!type) return '';
    return this.translate.getServiceTypeName([type]);
  })

  readonly locationText = signal<string>(this.location());
  readonly typeText = signal<string>(this.type());

  readonly timeslotText = computed<string>(()=>{
    const timeslot = this.user.filters().timeslot;
    const monthNames = this.monthNames();
    if(!timeslot || !monthNames || !monthNames.length) return '';
    const startDate = new Date(timeslot.startDate);
    const endDate = new Date(timeslot.endDate);

    const string_rep = timeslot.startDate !== timeslot.endDate?
      `${startDate.getDate()}.${monthNames[startDate.getMonth()]} - ${endDate.getDate()}.${monthNames[endDate.getMonth()]}  ${timeslot.start} - ${timeslot.end}` :
      `${startDate.getDate()}.${monthNames[startDate.getMonth()]}  ${timeslot.start} - ${timeslot.end}`

    return string_rep;
  })

  locationChange(value: string){
    this.locationText.set(value);
    if(value === '') this.user.clearLocation();
  }

  typeChange(value: string){
    this.typeText.set(value);
    if(value === '') this.user.clearServiceType();
  }

  locationSelect(index: number){
    const location = this.availableLocations[index];
    const locationText = this.availableLocationsStr()[index];
    if(!location || !locationText) return;

    this.locationText.set(locationText);
    this.user.setLocation(location);
  }

  typeSelect(index: number){
    const type = this.availableTypes[index];
    this.user.setServiceType(type);
    this.typeText.set(this.translate.getServiceTypeName([type]));
  }

  timeslotChanged(rep: string){
    if(rep === '') this.user.clearTimeslot();
  }

  datePicker(){
    this.openDatePicker.emit();
  }
}
