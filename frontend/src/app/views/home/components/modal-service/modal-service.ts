import { Component, computed, ElementRef, inject, output, signal, ViewChild } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { Router } from '@angular/router';
import { DOMAIN } from '../../../../CONST';
import { TranslationService } from '../../../../services/translation/translation';
import { isService, Service, TimestampedImage } from '../../../../models/models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-modal-service',
  imports: [DatePipe],
  templateUrl: './modal-service.html',
  styleUrl: './modal-service.css',
})
export class ModalService {
  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef<HTMLDivElement>;

  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  private readonly router = inject(Router);
  
  readonly close = output<void>()

  service = this.singleProvider.selected;
  studio = this.singleProvider.activeStudio;
  prerequirement = this.singleProvider.prerequirement;


  readonly getReserveText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.RESERVE');
  }) 

  readonly getPlaceholderPrereq = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.PREREQUIRE');
  }) 

  innerWidth = signal(window.innerWidth);
  readonly defaultWidth = 412;
  galleryItemSize = computed<number>(()=>{
    const iw = this.innerWidth();
    return Math.min(352, (iw / this.defaultWidth) * 160);
  }) 

  fullscreenImage: string | null = null;
  fullscreenImageCurrentIndex: number = 0;
  getHeroHeight = computed<number>(()=>{
    const iw = this.innerWidth();
    return (iw / this.defaultWidth) * 283;
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
    const service = this.service();
    if(!service) return '';
    return (service as Service).name;
  })

  hasDiscount = computed<boolean>(()=>{
    const service = this.service();
    if(!service) return false;
    return (service as Service).discount > 0;
  })

  getDiscount = computed<number>(()=> {
    const service = this.service();
    if(!service) return 0;
    return (service as Service).discount;
  })

  getPrice = computed<string>(()=>{
    const service = this.service();
    if(!service) return '';
    return (service as Service).price;
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
    const service = this.service();
    if(!service) return '';
    return (service as Service).currency;
  })

  getDuration = computed<number>(()=>{
    const service = this.service();
    if(!service) return 0;
    return (service as Service).duration;
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

  getImages = computed<TimestampedImage[]>(()=>{
    const service = this.service();
    if(!service) return [];
    return (service as Service).gallery;

  })

  getDescription = computed<string>(()=>{
    const service = this.service();
    if(!service) return '';
    return (service as Service).description;
  })

  getReservable = computed<boolean>(()=>{
    const service = this.service();
    if(!service) return false;
    return (service as Service).isReservable;
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
    const service = this.service();
    if(!studio || !service || !isService(service)) return;
    
    const url = DOMAIN + '/' + studio.link + '/' + service.link;

    if (navigator.share) {
      navigator.share({
        title: studio.name,
        text: `${service.name}: ${url}`,
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

  getTypeName(): string {
    const service = this.service() as Service;
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

  openImage(image: string, index: number){
    this.fullscreenImage = image;
    requestAnimationFrame(()=>{
      this.fullscreenScrollTo(index);
    })
  }

  closeImage(){
    this.fullscreenImage = null;
    this.fullscreenImageCurrentIndex = 0;
  }

  onFullscreenScroll(){
    this.updateFullscreenIndex();
  }
  fullscreenScrollTo(index: number){
    const container = this.scrollContainer.nativeElement;
    const child = container.children[index] as HTMLElement;
    child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest'});
  }

  private updateFullscreenIndex() {
    const container = this.scrollContainer.nativeElement;
    const containerCenter =
      container.scrollLeft + container.clientWidth / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    Array.from(container.children).forEach((child, index) => {
      const el = child as HTMLElement;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(containerCenter - elCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    this.fullscreenImageCurrentIndex = closestIndex;
  }
}
