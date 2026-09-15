import { Component, computed, inject } from '@angular/core';
import { TranslationService } from '../../../../services/translation/translation';
import { Router } from '@angular/router';

@Component({
  selector: 'reservation-status-missed',
  imports: [],
  templateUrl: './status-missed.html',
  styleUrl: './status-missed.css',
})
export class StatusMissed {
  private readonly translate = inject(TranslationService);
  private readonly router = inject(Router);

  readonly getMessageMissed = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('MESSAGES.MISSED_SCHEDULE');
  })

  readonly getMessageContact = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('MESSAGES.MORE_DETAILS');
  })

  
  navigateContact(){
    this.router.navigate(['contact']);
  }
}
