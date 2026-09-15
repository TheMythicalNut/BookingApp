import { Component, computed, effect, inject, output, Signal, signal, untracked } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { Button } from "../../../../../../components/common/button/button";
import { Checkbox } from "../../../../../../components/common/checkbox/checkbox";
import { NumberField } from "../../../../../../components/common/number-field/number-field";
import { Select } from "../../../../../../components/common/select/select";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { setup_errors } from '../../../../../../CONST';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";
import { RequestState, Studio } from '../../../../../../models/models';
import { UnifiedSetter } from '../../../../../../services/unified/unified-setter';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';

interface Rules {
  emailReminders: boolean;
  smsReminders: boolean;
  visible: boolean;
  minAhead: number;
  maxAhead: number;
}

interface TimeModifier {
  name: string;
  amount: number;
}

@Component({
  selector: 'setup-booking-rules',
  imports: [Button, Checkbox, NumberField, Select, ErrorMessage, RequestStatusMessage],
  templateUrl: './booking-rules.html',
  styleUrl: './booking-rules.css',
})
export class BookingRules {
  private readonly translate = inject(TranslationService);
  private readonly setup = inject(SetupService);
  
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setter = inject(UnifiedSetter);

  readonly next = output<void>();
  readonly vm = this.setup.bookingRulesVm;
  
  readonly saveRequestState = signal<RequestState<Studio>>(this.setter.idleState<'studio'>());
  readonly requestStatus = computed(() => this.saveRequestState().status);

  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['booking_rules']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.BOOKING_RULES.TITLE')
  });

  readonly errorBody = computed<string[]>(() => {
    const errors = this.errors();
    const form = this.vm().form;

    return Object.keys(errors).reduce<string[]>((errorList, key) => {
      if (form.hasError(key)) {
        errorList.push(errors[key]);
      }
      return errorList;
    }, []);
  });
  
  readonly viewInvalid = computed(()=> this.vm().state === 'invalid');
  
  readonly timeModifiers: TimeModifier[] = [
    {name: 'DATE.DAYS', amount: 24 * 60},
    {name: 'DATE.HOURS', amount: 60},
    {name: 'DATE.MINUTES', amount: 1},
  ]

  readonly selectedTimeModifierMin = signal<number>(0);
  readonly selectedTimeModifierMax = signal<number>(0);
  readonly selectedMinAheadValue = signal<number | null>(1);
  readonly selectedMaxAheadValue = signal<number | null>(30);

  constructor(){
    untracked(()=>{
      const vm = this.vm().value;
      if(vm.minAhead){
        if(vm.minAhead % (24 * 60) === 0){
          this.selectedMinAheadValue.set(vm.minAhead / (24 * 60));
          this.selectedTimeModifierMin.set(0);
        }
        else if(vm.minAhead % 60 === 0){
          this.selectedMinAheadValue.set(vm.minAhead / 60);
          this.selectedTimeModifierMin.set(1);
        }
        else {
          this.selectedMinAheadValue.set(vm.minAhead);
          this.selectedTimeModifierMin.set(2);
        }
      }
      if(vm.maxAhead){
        if(vm.maxAhead % (24 * 60) === 0){
          this.selectedMaxAheadValue.set(vm.maxAhead / (24 * 60));
          this.selectedTimeModifierMax.set(0);
        }
        else if(vm.maxAhead % 60 === 0){
          this.selectedMaxAheadValue.set(vm.maxAhead / 60);
          this.selectedTimeModifierMax.set(1);
        }
        else {
          this.selectedMaxAheadValue.set(vm.maxAhead);
          this.selectedTimeModifierMax.set(2);
        }
      }
    })
    this.setBookingRulesMinAhead();
    this.setBookingRulesMaxAhead();
  }

  minAheadValidator(value: number | null): boolean { return !!value && value >= 0; }
  maxAheadValidator(value: number | null): boolean { return !!value && value >= 0; }
  
  readonly timeModifierMap = computed(() => {
    const _ = this.translate.userLang();
    const modifiers = this.timeModifiers
    return new Map<string, TimeModifier>(modifiers.map(m => [this.translate.translate(m.name), m]));
  })

  readonly timeModifierNames = computed(()=>{
    const map = this.timeModifierMap();
    return Array.from(map.keys());
  })

  readonly selectedTimeModifierMinName = computed(()=>{
    const map = this.timeModifierMap();
    const index = this.selectedTimeModifierMin();
    return Array.from(map.keys()).at(index);
  })

  readonly selectedTimeModifierMaxName = computed(()=>{
    const map = this.timeModifierMap();
    const index = this.selectedTimeModifierMax();
    return Array.from(map.keys()).at(index);
  })

  readonly rules = computed<Rules>(()=>{
    const vm = this.vm().value;
    return vm as Rules;
  })
  
  readonly getTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.BOOKING_RULES.TITLE');
  })
  readonly getPar1 = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.BOOKING_RULES.PAR1');
  })

  readonly getEmailRemindersTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.BOOKING_RULES.EMAIL_REMINDERS_TITLE');
  })

  readonly getSMSRemindersTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.BOOKING_RULES.SMS_REMINDERS_TITLE');
  })

  readonly getBookingRulesVisibleTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.BOOKING_RULES.VISIBLE_TITLE');
  })

  readonly getMinAheadTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.BOOKING_RULES.MIN_AHEAD_TITLE');
  })

  readonly getMaxAheadTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.BOOKING_RULES.MAX_AHEAD_TITLE');
  })

  readonly getSaveButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.SAVE');
  })

  readonly getNextButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.NEXT');
  })

  setBookingRulesEmailReminders(value: boolean){
    this.setup.setBookingRulesEmailReminders(value);
  }

  setBookingRulesSMSReminders(value: boolean){
    this.setup.setBookingRulesSMSReminders(value);
  }

  setBookingRulesVisible(value: boolean){
    this.setup.setBookingRulesVisible(value);
  }

  setMinAhead(value: number){
    this.setup.setBookingRulesMinAhead(value);
  }

  setMaxAhead(value: number){
    this.setup.setBookingRulesMaxAhead(value);
  }


  setMinAheadValue(value: number | null){
    const current = this.selectedMinAheadValue();
    if(value === null && current === null) return;
    if(value !== null && value === current) return;
    this.selectedMinAheadValue.set(value);
  }

  setMinAheadModifier(value: string){
    if(value){
      const found = this.timeModifierMap().get(value);
      if(!found) return;
      const index = this.timeModifiers.indexOf(found);
      if(!index) return;
      this.selectedTimeModifierMin.set(index);
    }
  }

  setMaxAheadValue(value: number | null){
    const current = this.selectedMaxAheadValue();
    if(value === null && current === null) return;
    if(value !== null && value === current) return;
    this.selectedMaxAheadValue.set(value);
  }

  setMaxAheadModifier(value: string){
    if(value){
      const found = this.timeModifierMap().get(value);
      if(!found) return;
      const index = this.timeModifiers.indexOf(found);
      if(!index) return;
      this.selectedTimeModifierMax.set(index);
    }
  }

  setBookingRulesMinAhead(){
    effect(()=>{
      const modifier = this.selectedTimeModifierMin();
      const value = this.selectedMinAheadValue();
      this.setup.setBookingRulesMinAhead(value ? value * this.timeModifiers[modifier].amount : undefined);
    })
  }
  setBookingRulesMaxAhead(){
    effect(()=>{
      const modifier = this.selectedTimeModifierMax();
      const value = this.selectedMaxAheadValue();
      this.setup.setBookingRulesMaxAhead(value ? value * this.timeModifiers[modifier].amount : undefined);
    })
  }

  save(){
    if(!this.viewInvalid()) 
      this.setup.saveBookingRules()
      .subscribe({
        next: (value)=>{
          this.saveRequestState.set(value);
          if(value.status === 'success'){
            this.singleProvider.update(value.data);
            this.setup.markAsSaved('bookingRules');
          } 
        },
        error: (err)=>{ console.error(err); }
      });
  }
}
