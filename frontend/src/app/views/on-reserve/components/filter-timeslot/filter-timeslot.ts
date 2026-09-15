import { Component, computed, inject, output } from '@angular/core';
import { TextInput } from "../../../../components/common/text-input/text-input";
import { TranslationService } from '../../../../services/translation/translation';
import { UserProvider } from '../../../../services/user/user';

@Component({
  selector: 'app-filter-timeslot',
  imports: [TextInput],
  templateUrl: './filter-timeslot.html',
  styleUrl: './filter-timeslot.css',
})
export class FilterTimeslot {

  private readonly user = inject(UserProvider);
  private readonly translate = inject(TranslationService);
  
  private readonly monthNames = this.translate.monthNames;

  readonly openDatePicker = output<void>();

  readonly timeslotPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.TIMESLOT');
  })

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
  
  timeslotChanged(rep: string){
    if(rep === '') this.user.clearTimeslot();
  }

  datePicker(){
    this.openDatePicker.emit();
  }
}
