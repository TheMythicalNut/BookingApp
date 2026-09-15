import { Component, computed, effect, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FilterTimeslot } from "./components/filter-timeslot/filter-timeslot";
import { DatePicker } from "../../components/modals/date-picker/date-picker";
import { Recommendations } from "./components/recommendations/recommendations";
import { TimeslotSelect } from "./components/timeslot-select/timeslot-select";
import { DateSelect } from "./components/date-select/date-select";
import { TranslationService } from '../../services/translation/translation';
import { UserProvider } from '../../services/user/user';
import { Info } from "./components/info/info";
import { isPackage, isService, RequestState, Reservation } from '../../models/models';
import { isValidEmail, isValidPhone } from '../../util/email_validator';
import { dateToYYYYMMDD, toYYYY_MM_DD } from '../../util/studio_days';
import { UnifiedSingleProvider } from '../../services/unified/unified-single-provider';
import { TextField } from "../../components/common/text-field/text-field";
import { TextArea } from "../../components/common/text-area/text-area";
import { UnifiedSetter } from '../../services/unified/unified-setter';
import { RequestStatusMessage } from "../../components/common/request-status-message/request-status-message";
import { Spinner } from "../../components/common/spinner/spinner";
import { TranslatePipe } from '../../pipes/translate-pipe';

@Component({
  selector: 'app-on-reserve',
  imports: [FilterTimeslot, DatePicker, Recommendations, TimeslotSelect, DateSelect, Info, TextField, TextArea, RequestStatusMessage, TranslatePipe],
  templateUrl: './on-reserve.html',
  styleUrl: './on-reserve.css',
})
export class OnReserve {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  private readonly user = inject(UserProvider);
  private readonly setter = inject(UnifiedSetter);

  readonly createState = signal<RequestState<Reservation>>({ status: 'idle'});
  readonly status = computed(() => this.createState().status);

  readonly resendState = signal<RequestState<void>>({ status: 'idle'});
  readonly resendStatus = computed(() => this.resendState().status);

  readonly showDatePicker = signal(false);
  readonly date = signal<Date | undefined>(undefined);
  readonly time = signal<string | undefined>(undefined);

  readonly reservation = signal<Reservation | undefined>(undefined);

  readonly pageState = signal<'pick' | 'confirm' | 'post-confirm'>('pick');

  readonly userPhone = signal('');
  readonly message = signal('');
  readonly userEmail = signal('');
  readonly validEmail = signal(false);
  readonly validPhone = signal(false);

  readonly selected = this.singleProvider.selected;
  readonly studio = this.singleProvider.activeStudio;
  
  private savedScrollY = 0;

  constructor(){
    effect(()=>{
      const filters = this.user.filters();
      if(filters.timeslot && filters.timeslot.startDate.getTime() === filters.timeslot.endDate.getTime()){
        this.date.set(filters.timeslot.startDate);
      }
    })
    effect(()=>{
      const phone = this.user.phone();
      const email = this.user.email();
      if(phone)
        this.userPhone.set(phone);
      if(email)
        this.userEmail.set(email);
    });

    effect(()=>{
      const showDP = this.showDatePicker();
      if(showDP) this.stopScroll();
      else this.allowScroll();
    })
  }

  readonly isReserveDisabled = computed(()=>{
    const date = this.date();
    const time = this.time();
    const rc = this.pageState() !== 'pick';
    const phone = this.validPhone();
    const email = this.validEmail();
    return (rc && !(!!phone && !!email)) || 
    ((!rc) && !(!!date && !!time));
  })

  readonly getButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.CONTINUE')
  })

  readonly getButtonConfirmText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.CONFIRM')
  })

  readonly getInvalidEmailMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.INVALID_EMAIL')
  })

  readonly getEmailInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.EMAIL')
  })

  readonly getEmailPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.EMAIL')
  })
  
  readonly getInvalidPhoneMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.INVALID_PHONE')
  })

  readonly getPhoneInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.PHONE')
  })

  readonly getPhonePlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.PHONE')
  })

  readonly getMessageInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.ADDITIONAL')
  })

  readonly getMessagePlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.ADDITIONAL')
  })
  
  readonly emailValidator = (email: string): boolean => { return isValidEmail(email); }
  readonly phoneValidator = (phone: string): boolean => { return isValidPhone(phone); }

  selectDate(date: Date){
    this.date.set(date);
    this.scrollToBottom();
  }
  selectTime(time: string | null){
    this.time.set(time?? undefined);
  }

  stopScroll() {
    this.savedScrollY = window.pageYOffset || document.documentElement.scrollTop;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  allowScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    window.scrollTo({
      top: this.savedScrollY,
      behavior: 'auto'
    });
  }

  onReserve(){
    const state = this.pageState();
    switch(state){
      case 'pick':
        const dt = this.date();
        if(!dt) return;
        const time = this.time();

        const selected = this.selected();
        const studio = this.studio();
        
        if(!time || !studio || !selected || !(isService(selected) || isPackage(selected))) return;
        
        const date = dateToYYYYMMDD(dt);
        let category = isService(selected) 
          ? studio.categories.find(it => it.services.includes(selected.id))?.name
          : 'PACKAGE_TYPE';

        if(!category) return;

        const res: Reservation = {
          id: '-1',
          studioName: studio.name,
          categoryName: category,
          articleName: selected.name,
          articleType: isService(selected)? selected.type : ['PACKAGE_TYPE'],
          addons: [],
          price: selected.price,
          currency: selected.currency,
          discount: selected.discount,
          duration: selected.duration,
          timeslot: {
            date: date,
            start: time,
            end: undefined
          },
          contactPhone: studio.contactPhone,
          country: studio.country,
          city: studio.city,
          address: studio.street + ' ' + studio.buildingNumber + '/' + studio.apartmentNumber,
          latitude: studio.latitude,
          longitude: studio.longitude,
          timeZone: studio.timeZone,
          status: {
            status: 'PENDING_CONFIRMATION',
            comment: undefined
          },
          termChangeCount: 0,
          userEmail: '',
          userPhone: '',
          additionalNote: '',
          timestamp: '',
          user: '-1',
          studio: studio.id,
          service: isService(selected)? selected.id : '',
          package: isPackage(selected)? selected.id : ''
        }
        this.reservation.set(res);

        this.pageState.set('confirm');
        this.scrollToTop();
        break;

      case 'confirm':
        const email = this.userEmail();
        const phone = this.userPhone();
        const note = this.message();
        const reservation = this.reservation();

        if(!email || !phone || !this.validEmail() || !this.validPhone() || !reservation) return;

        this.user.setEmail(email);
        this.user.setPhone(phone);

        const finalReservation: Omit<Reservation, 'id'> = {
          ...reservation,
          userEmail: email,
          userPhone: phone,
          additionalNote: note,
        }

        this.reservation.set({...finalReservation, id: '-1'});
        
        const request$ = this.setter.create('reservation', finalReservation);
        request$.subscribe({
          next: (value)=>{ 
            this.createState.set(value);
            if(value.status === 'success'){
              this.singleProvider.update(value.data);
              this.reservation.set(value.data);
            } 
          },
          error: (err)=>{ console.error(err); }
        });

        this.pageState.set('post-confirm');
        break;
    }
  }

  resendLink(){
    const res = this.reservation();
    if(!res) return;
    const request$ = this.setter.resendEmail(res.id);
    request$.subscribe({
      next: (value)=>{ 
        this.resendState.set(value);
       },
      error: (err)=>{ console.error(err); }
    });
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  scrollToBottom() {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }
}
