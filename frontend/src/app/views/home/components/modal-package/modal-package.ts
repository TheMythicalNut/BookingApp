import { Component, computed, inject, output, signal } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { Router } from '@angular/router';
import { isPackage, Package, Service } from '../../../../models/models';
import { DOMAIN } from '../../../../CONST';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-modal-package',
  imports: [UpperCasePipe],
  templateUrl: './modal-package.html',
  styleUrl: './modal-package.css',
})
export class ModalPackage {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  private readonly router = inject(Router);
  
  readonly close = output<void>()

  pkg = this.singleProvider.selected;
  studio = this.singleProvider.activeStudio;
  services = this.singleProvider.activeServices;
  prerequirement = this.singleProvider.prerequirement;

  innerWidth = signal(window.innerWidth);
  readonly defaultWidth = 412;
  galleryItemSize = computed<number>(()=>{
    const iw = this.innerWidth();
    return Math.min(352, (iw / this.defaultWidth) * 160);
  }) 

  
  readonly getReserveText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.RESERVE');
  }) 
  
  readonly getPlaceholderPrereq = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.PREREQUIRE');
  }) 


  getStudioName = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.name;
  })

  hasPrerequirement = computed<boolean>(()=>{
    const prereq = this.prerequirement();
    return !!prereq;
  })

  getPrereqName = computed<string>(()=>{
    const prereq = this.prerequirement();
    if(!prereq) return '';
    return prereq.name;
  })

  getName = computed<string>(()=>{
    const pkg = this.pkg();
    if(!pkg) return '';
    return (pkg as Package).name;
  })

  hasDiscount = computed<boolean>(()=>{
    const pkg = this.pkg();
    if(!pkg) return false;
    return (pkg as Package).discount > 0;
  })

  getDiscount = computed<number>(()=> {
    const pkg = this.pkg();
    if(!pkg) return 0;
    return (pkg as Package).discount;
  })

  getPrice = computed<string>(()=>{
    const pkg = this.pkg();
    if(!pkg) return '';
    return (pkg as Package).price;
  })

  getDiscountPrice = computed<string>(()=>{
    const value = this.getPrice();
    const discount = this.getDiscount();
    const regex = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
    if (!regex.test(value)) return 'ERROR';

    const num = Number(value.replace(/\./g, '').replace(',', '.'));
    const price = num * ((100-discount) / 100);

    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  })
  
  getCurrency = computed<string>(()=>{
    const pkg = this.pkg();
    if(!pkg) return '';
    return (pkg as Package).currency;
  })

  getDuration = computed<number>(()=>{
    const pkg = this.pkg();
    if(!pkg) return 0;
    return (pkg as Package).duration;
  })

  getCountry = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.country;
  })

  getCity = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.city;
  })

  getAddress = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.street + ' ' + studio.buildingNumber + '/' + studio.apartmentNumber;
  })

  get getTypeName(): string {
    return this.translate.translate('PACKAGE_TYPE');
  }
  
  getDescription = computed<string>(()=>{
    const pkg = this.pkg();
    if(!pkg) return '';
    return (pkg as Package).description;
  })

  getReservable = computed<boolean>(()=>{
    const pkg = this.pkg();
    if(!pkg) return false;
    return (pkg as Package).isReservable;
  })
  

  onClose(){
    this.close.emit();
  }

  navigateStudio(){
    const studio = this.studio();
    if(!studio) return;
    this.singleProvider.select('studio', studio.id);
    this.router.navigate([studio.link]);
  }

  navigateMaps(): void {
    const searchQuery = `${this.getStudioName()} ${this.getAddress()}, ${this.getCity()}, ${this.getCountry()}`

    if (!searchQuery?.trim()) return;
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    window.open(url, '_blank');
  }

  onShare(){
    const studio = this.studio();
    const pkg = this.pkg();
    if(!studio || !pkg || !isPackage(pkg)) return;
    
    const url = DOMAIN + '/' + studio.link + '/' + pkg.link;

    if (navigator.share) {
      navigator.share({
        title: studio.name,
        text: `${pkg.name}: ${url}`,
        url
      }).catch(() => {
        // User cancelled or share failed — intentionally ignored
      });
    } else {
      navigator.clipboard.writeText(url);
      const msg = this.translate.translate('MESSAGES.LINK_COPIED');
      alert(msg);
    }
  }

  getServiceTypeName(service: Service): string {
    if(!service) return '';
    return this.translate.getServiceTypeName(service.type);
  }

  onReserve(){
    this.router.navigate(['reserve']);
  }

  onPrerequirement(){
    const prereq = this.prerequirement();
    if(!prereq) return;
    this.singleProvider.select('service', prereq.id, false);
  }

  onService(id: string){
    this.singleProvider.select('service', id, false);
  }

}
