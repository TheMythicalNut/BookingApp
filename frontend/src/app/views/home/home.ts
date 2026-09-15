import { afterRenderEffect, Component, computed, effect, inject, Signal, signal } from '@angular/core';
import { TwoStateButton } from "./components/two-state-button/two-state-button";
import { Binary, FiltersExpandedState, HomeTopbarState } from '../../models/models';
import { Topbar } from "./components/topbar/topbar";
import { ListArticles } from "./components/list-articles/list-articles";
import { ListStudios } from "./components/list-studios/list-studios";
import { ModalNavigation } from "../../components/modals/modal-navigation/modal-navigation";
import { ModalContainer } from "./components/modal-container/modal-container";
import { FilterStudios } from "./components/filter-studios/filter-studios";
import { FilterArticles } from "./components/filter-articles/filter-articles";
import { DatePicker } from '../../components/modals/date-picker/date-picker';
import { UserProvider } from '../../services/user/user';
import { Router } from '@angular/router';
import { HydrationProvider } from '../../services/hydration/hydration-provider';

@Component({
  selector: 'app-home',
  imports: [TwoStateButton, Topbar, ListArticles, ListStudios, ModalNavigation, ModalContainer, FilterStudios, FilterArticles, DatePicker],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly user = inject(UserProvider);
  private readonly router = inject(Router);

  readonly selectedList = signal<Binary>(1);
  readonly filtersMode = 
    signal<FiltersExpandedState>({
      0: true,
      1: true,
    });
  readonly navigationMode = signal(false);
  readonly showDatePicker = signal(false);

  readonly isActiveStudiosList = computed(() => this.selectedList() === 0);
  readonly isActiveArticlesList = computed(() => this.selectedList() === 1);
  readonly isExpandedStudioFilters = computed(()=> this.isActiveStudiosList() && this.filtersMode()[0])
  readonly isExpandedArticleFilters = computed(()=> this.isActiveArticlesList() && this.filtersMode()[1])

  private readonly scrollY = [0, 0];
  selectList(value: Binary){
    const currentIndex = this.selectedList();
    this.scrollY[currentIndex] = window.scrollY;
    this.selectedList.set(value);
  }
  constructor(){
    this.user.testAuth().subscribe({
      next: (value)=>{
        if(value.status === 'success' && value.data === true)
          this.router.navigate(['mystudio'])
      }
    })

    effect(()=>{
      const showDP = this.showDatePicker();
      if(showDP) this.stopScroll();
      else this.allowScroll();
    })
    afterRenderEffect(()=>{
      const selected = this.selectedList();
      const targetY = this.scrollY[selected];
    
      const attemptScroll = () => {
        if (document.documentElement.scrollHeight >= targetY) {
          window.scrollTo(0, targetY);
        } else {
          requestAnimationFrame(attemptScroll);
        }
      };
      
      requestAnimationFrame(attemptScroll);
    })
  }

  readonly topbarState = computed<HomeTopbarState>(() => {
    if (this.navigationMode()) return 'modal';
    const active = this.selectedList();
    const expanded = this.filtersMode()[active];
    return expanded? 'menu' : 'none';
  });

  toggleModalNavigation(): void {
    this.navigationMode.update(v => !v);
  }

  onMenuPressed(): void {
    if(this.navigationMode()){
      this.navigationMode.set(false);
      return;
    }
    const active = this.selectedList();

    this.filtersMode.update(state => ({
      ...state,
      [active]: !state[active]
    }));
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
