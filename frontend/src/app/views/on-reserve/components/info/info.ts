import { Component, computed, inject, input } from '@angular/core';
import { isReservation, Reservation } from '../../../../models/models';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { InfoLine } from "../../../reservation-overview/components/info-line/info-line";
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'reserve-info',
  imports: [InfoLine, UpperCasePipe],
  templateUrl: './info.html',
  styleUrl: './info.css',
})
export class Info {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);

  readonly reservation = input<Reservation>()
  readonly studio = this.singleProvider.activeStudio;

  readonly hasDiscount = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res as Reservation)) return false;
    return !!res.discount;
  })

  readonly getReservationTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.TITLE');
  })
  readonly getStudioNameText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.STUDIO_NAME');
  })

  readonly getServiceNameText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.SERVICE_NAME');
  })
  readonly getCategoryNameText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.CATEGORY');
  })
  readonly getServiceTypeText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.SERVICE_TYPE');
  })
  readonly getPriceText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.PRICE');
  })
  readonly getDurationText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.DURATION');
  })
  readonly getDateText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.DATE');
  })
  readonly getAddressText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.ADDRESS');
  })
    readonly getContactPhoneText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.CONTACT_PHONE');
  })
    readonly getStatusText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('RESERVATION_OVERVIEW.OVERVIEW.STATUS');
  })

  readonly getStudioName = computed<string>(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.studioName;
  })

  readonly getServiceName = computed<string>(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.articleName;
  })

  readonly getCategory = computed<string>(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    if(res.service){
      return res.categoryName;
    }
    else
      return this.translate.translate(res.categoryName);
  })

  readonly getServiceType = computed<string>(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    if(res.service){
      return this.translate.getServiceTypeName(res.articleType);
    }
    else{
      return this.translate.translate('PACKAGE_TYPE')
    }
  })

  readonly getDiscountPrice = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    
    const value = res.price;
    const discount = res.discount;
    
    const regex = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
    if (!regex.test(value)) return 'ERROR';
    
    const num = Number(value.replace(/\./g, '').replace(',', '.'));
    const price = num * ((100-discount) / 100);

    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price) + ' ' + res.currency;

  })

  readonly getPrice = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.price + ' ' + res.currency;
  })

  readonly getDuration = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.duration + ' min';
  })

  readonly getTimeslot = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    const [yyyy, mm, dd] = res.timeslot.date.split('-');
    const mn = this.translate.monthNames()[parseInt(mm) - 1];
    return  dd + '. ' + mn + ', ' + res.timeslot.start;
  })

  readonly getContactPhone = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.contactPhone;
  })
  
  readonly getStatus = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return this.translate.translate('RESERVATION_OVERVIEW.STATUS.' + res.status.status);
  })

  readonly getCountry = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.country;
  })

  readonly getCity = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.city;
  })

  readonly getAddress = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.street + ' ' + studio.buildingNumber + '/' + studio.apartmentNumber;
  })
}
