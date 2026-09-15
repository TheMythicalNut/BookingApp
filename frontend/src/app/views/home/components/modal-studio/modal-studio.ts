import { Component, computed, inject, output, signal } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { Router } from '@angular/router';
import { DOMAIN } from '../../../../CONST';
import { HeroCarousel } from "../../../studio/components/hero-carousel/hero-carousel";
import { ButtonBookPrimary } from "../../../studio/components/button-book-primary/button-book-primary";
import { OpenStatus } from "../../../studio/components/open-status/open-status";
import { NavigateMaps } from "../../../studio/components/navigate-maps/navigate-maps";
import { ListPackages } from "../../../studio/components/list-packages/list-packages";
import { ListServices } from "../../../studio/components/list-services/list-services";
import { WorkingDays } from "../../../studio/components/working-days/working-days";
import { ContactBar } from "../../../studio/components/contact-bar/contact-bar";

@Component({
  selector: 'app-modal-studio',
  imports: [HeroCarousel, ButtonBookPrimary, OpenStatus, NavigateMaps, ListPackages, ListServices, WorkingDays, ContactBar],
  templateUrl: './modal-studio.html',
  styleUrl: './modal-studio.css',
})
export class ModalStudio {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  private readonly router = inject(Router);
  
  readonly close = output<void>()
  
  innerWidth = signal(window.innerWidth);
  readonly defaultWidth = 412;

  readonly getHeroHeight = computed<number>(()=>{
    const iw = this.innerWidth();
    return Math.min((iw / this.defaultWidth) * 283, 608);
  })

  readonly getServiceSize = computed<number>(()=>{
    const iw = this.innerWidth();
    return Math.min(352, (iw / this.defaultWidth) * 160);
  }) 

  studio = this.singleProvider.activeStudio;

  readonly getName = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.name;
  })

  readonly getImages = computed<string[]>(()=>{
    const studio = this.studio();
    if(!studio) return [];
    return studio.heroImages.map(h => h.url);
  })

  onClose(){
    this.close.emit();
  }

  navigateStudio(){
    const studio = this.studio();
    if(!studio) return;
    this.router.navigate([studio.link]);
  }

  onShare(){
    const studio = this.studio();
    if(!studio) return;
    
    const url = DOMAIN + '/' + studio.link;

    if (navigator.share) {
      navigator.share({
        title: studio.name,
        text: `${studio.name}: ${url}`,
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

}