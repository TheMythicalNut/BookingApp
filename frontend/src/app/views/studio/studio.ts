import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, untracked, ViewChild } from '@angular/core';
import { ModalNavigation } from "../../components/modals/modal-navigation/modal-navigation";
import { UnifiedSingleProvider } from '../../services/unified/unified-single-provider';
import { TranslationService } from '../../services/translation/translation';
import { ActivatedRoute, Router } from '@angular/router';
import { Category, HomeTopbarState, isPackage, isService, Package, Service, Studio } from '../../models/models';
import { DOMAIN } from '../../CONST';
import { StudioMenu } from "./components/studio-menu/studio-menu";
import { Topbar } from "./components/topbar/topbar";
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalContainer } from "../home/components/modal-container/modal-container";
import { HeroCarousel } from "./components/hero-carousel/hero-carousel";
import { ContactBar } from "./components/contact-bar/contact-bar";
import { WorkingDays } from "./components/working-days/working-days";
import { NavigateMaps } from "./components/navigate-maps/navigate-maps";
import { OpenStatus } from "./components/open-status/open-status";
import { ButtonBookPrimary } from "./components/button-book-primary/button-book-primary";
import { ListPackages } from "./components/list-packages/list-packages";
import { ListServices } from "./components/list-services/list-services";
import { Map } from "./components/map/map";
import { Spinner } from "../../components/common/spinner/spinner";

@Component({
  selector: 'app-studio',
  imports: [ModalNavigation, StudioMenu, Topbar, ModalContainer, HeroCarousel, ContactBar, WorkingDays, NavigateMaps, OpenStatus, ButtonBookPrimary, ListPackages, ListServices, Map, Spinner],
  templateUrl: './studio.html',
  styleUrl: './studio.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudioView {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  
  readonly loading = this.singleProvider.loading;
  selected = this.singleProvider.selected;
  studio = this.singleProvider.activeStudio;

  innerWidth = signal(window.innerWidth);
  readonly defaultWidth = 412;

  readonly menuMode = signal(false);

  readonly topbarState = computed<HomeTopbarState>(() => {
    if (this.navigationMode()) return 'modal';
    if (this.menuMode()) return 'menu';
    return 'none';
  });
  
  getHeroHeight = computed<number>(()=>{
    const iw = this.innerWidth();
    return Math.min((iw / this.defaultWidth) * 283, 608);
  })

  getServiceSize = computed<number>(()=>{
    const iw = this.innerWidth();
    return Math.min(0.5 * iw - 50, 416);
  })

  getImages = computed<string[]>(()=>{
    const studio = this.studio();
    if(!studio) return [];
    return studio.heroImages.map(h => h.url);
  })

  private params = toSignal(this.route.paramMap);
  readonly studioLink = computed(() => this.params()?.get('studio'));
  readonly articleLink = computed(() => this.params()?.get('article'));
  
  constructor(){

    effect(()=>{
      const menu = this.menuMode();
      const navigation = this.navigationMode();
      if(menu || navigation) this.stopScroll();
      else this.allowScroll()
    })

    effect(()=>{
      const studio = this.studioLink();
      const article = this.articleLink();

      untracked(() => {
        const current = this.studio();
        const selected = this.singleProvider.selected();


        if(!studio) return;

        if(article){
          if(selected && (isService(selected) || isPackage(selected)) && selected.link === article) return;
          this.singleProvider.select('article', article, true);
        } else {
          if(current && current.link === studio) return;
          this.singleProvider.select('studio', studio, true);
        }
      })
      
    })
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

  onMenuPressed(): void {
    if(this.navigationMode()){
      this.navigationMode.set(false);
      return;
    }
    this.menuMode.update(v => !v);
  }

  onPackage(id: string){
    this.singleProvider.select('package', id);
  }

  onService(id: string){
    this.singleProvider.select('service', id);
  }
  
  readonly navigationMode = signal(false);
  toggleModalNavigation(): void {
    this.navigationMode.update(v => !v);
  }

  private savedScrollY = 0;
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
}
