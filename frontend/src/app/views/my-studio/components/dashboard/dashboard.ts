import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { DashboardStateDetails, Sidebar } from "../setup/components/sidebar/sidebar";
import { DashboardState, SetupState } from '../../../../models/models';
import { TranslationService } from '../../../../services/translation/translation';
import { Main } from "./components/main/main";
import { Reservations } from "./components/reservations/reservations";
import { Ratings } from "./components/ratings/ratings";
import { Schedule } from "./components/schedule/schedule";

@Component({
  selector: 'my-studio-dashboard',
  imports: [Sidebar, Main, Reservations, Ratings, Schedule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly translate = inject(TranslationService)
  
  readonly pageState = signal<DashboardState>('MAIN');
  readonly navSetup = output<void>();
  
  private readonly defaultStates: DashboardStateDetails[] = [
    { state: 'MAIN', details: 'selected' },
    { state: 'SCHEDULE', details: 'empty' },
    { state: 'RESERVATIONS', details: 'empty' },
    { state: 'RATINGS', details: 'empty' },
    //{ state: 'CLIENTS', details: 'empty'},
    //{ state: 'STATISTICS', details: 'empty' },
    { state: 'SETUP', details: 'empty' },
  ];
  
  readonly DashboardStates = signal<DashboardStateDetails[]>(this.defaultStates);

  navigate(section: SetupState | DashboardState): void {
    if(section === 'SETUP'){ this.navSetup.emit(); return; }

    const states = this.DashboardStates();
    
    const prevIndex = states.findIndex(s => s.details === 'selected');
    
    if(prevIndex !== -1 && states[prevIndex].state === section) return;

    this.DashboardStates.update(v => v.map(i => ({
      state: i.state,
      details: i.state === section ? 'selected' : 'empty'
    })));

    this.pageState.set(section as DashboardState);
  }
  
  readonly getTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('DASHBOARD.TITLE');
  });
}
