import { Component, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { DashboardState, isOwner, Owner, SetupState } from '../../../../models/models';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SetupStateDetails, Sidebar } from "./components/sidebar/sidebar";
import { Introduction } from "./components/introduction/introduction";
import { Profile } from "./components/profile/profile";
import { Location } from "./components/location/location";
import { Media } from "./components/media/media";
import { Schedule } from "./components/schedule/schedule";
import { Categories } from "./components/categories/categories";
import { ScheduleExceptions } from "./components/schedule-exceptions/schedule-exceptions";
import { Services } from "./components/services/services";
import { Packages } from "./components/packages/packages";
import { Discounts } from "./components/discounts/discounts";
import { Publish } from "./components/publish/publish";
import { BookingRules } from "./components/booking-rules/booking-rules";
import { SetupService } from '../../../../services/setup-service/setup-service';
import { TranslationService } from '../../../../services/translation/translation';
import { UnifiedSetter } from '../../../../services/unified/unified-setter';


@Component({
  selector: 'my-studio-setup',
  imports: [FormsModule, ReactiveFormsModule, Sidebar, Introduction, Profile, Location, Media, Schedule, Categories, ScheduleExceptions, Services, Packages, Discounts, Publish, BookingRules],
  templateUrl: './setup.html',
  styleUrl: './setup.css',
})
export class Setup {
  private readonly setup = inject(SetupService);
  private readonly setter = inject(UnifiedSetter);
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  
  readonly pageState = signal<SetupState>('INTRO');
  readonly navDashboard = output<void>();
  
  private readonly defaultStates: SetupStateDetails[] = [
    { state: 'INTRO', details: 'empty' },   // 0
    { state: 'PROFILE', details: 'empty' }, // 1
    { state: 'LOCATION', details: 'empty' },// 2
    { state: 'MEDIA', details: 'empty' },   // 3
    { state: 'SCHEDULE', details: 'empty' },// 4
    { state: 'EXCEPTIONS', details: 'empty' }, // 5
    { state: 'CATEGORIES', details: 'empty' }, // 6
    { state: 'SERVICES', details: 'empty' },   // 7
    { state: 'PACKAGES', details: 'empty' },   // 8
    { state: 'DISCOUNTS', details: 'empty' },  // 9
    { state: 'BOOKING_RULES', details: 'empty' }, // 10
    { state: 'PUBLISH', details: 'empty'}, // 11
  ];

  private readonly profileVm = this.setup.profileVm;
  private readonly locationVm = this.setup.locationVm;
  private readonly mediaVm = this.setup.mediaVm;
  private readonly scheduleVm = this.setup.scheduleVm;
  private readonly exceptionsVm = this.setup.exceptionsVm;
  private readonly categoriesVm = this.setup.categoriesVm;
  private readonly servicesVm = this.setup.servicesVm;
  private readonly packagesVm = this.setup.packagesVm;
  private readonly discountsVm = this.setup.discountsVm;
  private readonly bookingRulesVm = this.setup.bookingRulesVm;


  private readonly owner = computed<Owner | undefined>(() => {
    const selected = this.singleProvider.selected();
    if(!selected || !isOwner(selected)) return undefined;
    return selected;
  });

  private getUpdatedStates(targetState: string): SetupStateDetails[] {
    return this.defaultStates.map((item) => ({
      ...item,
      details: item.state === targetState ? 'selected' : item.details
    }));
  }
  
  readonly SetupStates = signal<SetupStateDetails[]>(this.defaultStates);

  constructor(){
    effect(() => {
      const owner = this.singleProvider.selected();
      if (!owner || !isOwner(owner)) return;
      if(owner.setupState === 'COMPLETED'){
        this.defaultStates.push({ state: 'DASHBOARD', details: 'empty' });
      }
      this.updateAllDetails();

      
      owner.setupState !== 'COMPLETED'
        ? this.SetupStates.set(this.getUpdatedStates(owner.setupState))
        : this.SetupStates.set(this.getUpdatedStates('INTRO'));

      owner.setupState !== 'COMPLETED'
        ? this.pageState.set(owner.setupState)
        : this.pageState.set('INTRO');
    });
  }

  navigate(section: SetupState | DashboardState): void {
    if(section === 'DASHBOARD'){ this.navDashboard.emit(); return; }
    const states = this.SetupStates();
    
    const prevIndex = states.findIndex(s => s.details === 'selected');
    
    if(prevIndex !== -1 && states[prevIndex].state === section) return;

    
    if(prevIndex !== -1){
      this.updateSetupStateByIndex(prevIndex);
    }

    this.SetupStates.update(v => v.map(i => ({
      state: i.state,
      details: i.state === section ? 'selected' : i.details
    })));

    this.pageState.set(section as SetupState);

    const owner = this.owner();
    if(owner && owner.setupState !== 'COMPLETED'){
      this.setter.update('owner', 
        { 
          id: owner.id, 
          setupState: section as SetupState
        }
      ).subscribe({
        next: (value)=>{
          if(value.status === 'success'){
            this.singleProvider.update(value.data);
          }
        },
        error: (err)=>{
          console.error(err);
        }
      });
    }
  }

  private updateAllDetails(){
    untracked(()=>{
      for(let i = 1; i <= 10; i ++ )
        this.updateSetupStateByIndex(i);
    })
  }

  private updateSetupStateByIndex(index: number){
    if( index < 0 || index > 11) return;
    let vm;
    switch(index){
      case 0: this.SetupStates.update(v => v.map((item, i) => i === 0 ? { ...item, details: 'empty' } : item )); return;
      case 1: vm = this.profileVm(); break;
      case 2: vm = this.locationVm(); break;
      case 3: vm = this.mediaVm(); break;
      case 4: vm = this.scheduleVm(); break;
      case 5: vm = this.exceptionsVm(); break;
      case 6: vm = this.categoriesVm(); break;
      case 7: vm = this.servicesVm(); break;
      case 8: vm = this.packagesVm(); break;
      case 9: vm = this.discountsVm(); break;
      case 10: vm = this.bookingRulesVm(); break;
      case 11: this.SetupStates.update(v => v.map((item, i) => i === 11 ? { ...item, details: 'empty' } : item )); return;
    }
    
    if(!vm) return;
    if(vm.state === 'invalid') { this.SetupStates.update(v => v.map((item, i)=> i === index ? { ...item, details: 'invalid'}: item));
    } else if(vm.hasUnsaved) { this.SetupStates.update(v => v.map((item, i)=> i === index ? {...item, details: 'modified' } : item ));
    } else { this.SetupStates.update(v => v.map((item, i)=> i === index ? { ...item, details: 'empty'} : item))}
  }


  readonly getTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.TITLE');
  });
}