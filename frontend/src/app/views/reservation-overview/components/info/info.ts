import { Component, computed, inject, input } from '@angular/core';
import { InfoLine } from "../info-line/info-line";
import { isReservation, Package, Reservation, Service, Studio } from '../../../../models/models';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { Router } from '@angular/router';
import { TranslationService } from '../../../../services/translation/translation';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'reservation-info',
  imports: [InfoLine, UpperCasePipe],
  templateUrl: './info.html',
  styleUrl: './info.css',
})
export class Info {
  private readonly translate = inject(TranslationService);
  private readonly router = inject(Router);

  readonly reservation = input<Reservation>();
  readonly studio = input<Studio>();
  readonly service = input<Service | undefined>(undefined);
  readonly package = input<Package | undefined>(undefined);

  readonly hasDiscount = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return false;
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
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.country;
  })

  readonly getCity = computed<string>(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.city;
  })

  readonly getAddress = computed<string>(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.address;
  })

  navigateMaps(): void {
    const searchQuery = `${this.getStudioName()} ${this.getAddress()}, ${this.getCity()}, ${this.getCountry()}`

    if (!searchQuery?.trim()) return;
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    window.open(url, '_blank');
  }

  navigateStudio(){
    const res = this.reservation();
    if(!res || !isReservation(res)) return;
    const studio = this.studio();
    if(!studio) return;
    this.router.navigate([studio.link]);
  }

  navigateService(){
    const res = this.reservation();
    if(!res || !isReservation(res)) return;
    const studio = this.studio();
    if(!studio) return;

    if(!!res.service){
      const service = this.service();
      if(!service) return;
      this.router.navigate([studio.link, service.link])
    }

    if(!!res.package){
      const pkg = this.package();
      if(!pkg) return;
      this.router.navigate([studio.link, pkg.link])
    }
  }

  navigateContact(){
    this.router.navigate(['contact']);
  }

  goToCall(){
    const res = this.reservation();
    if(!res || !isReservation(res)) return;
    const sanitized = res.contactPhone.replace(/[^\d]/g, '');
    window.location.href = `tel:${sanitized}`;
  }

}
