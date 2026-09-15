import { Component, computed, inject } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { getStudioOpenStatus, OpenStatusResult } from '../../../../util/studio_hours';

@Component({
  selector: 'studio-open-status',
  imports: [],
  templateUrl: './open-status.html',
  styleUrl: './open-status.css',
})
export class OpenStatus {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  readonly studio = this.singleProvider.activeStudio;

  isOpen = computed<boolean>(()=>{
    const status = this.openStatus();
    if(!status) return false;
    return status.isOpen;
  })

  isOpenText = computed<string>(()=>{
    const isOpen = this.isOpen();
    const _ = this.translate.userLang();
    return this.translate.translate(isOpen? 'MESSAGES.OPEN' : 'MESSAGES.CLOSED');
  })

  hasChangeTime = computed<boolean>(()=>{
    const status = this.openStatus();
    if(!status) return false;
    return !!status.changesAt
  })

  getChangeText = computed<string>(()=>{
    const isOpen = this.isOpen();
    const _ = this.translate.userLang();
    return this.translate.translate(isOpen? 'MESSAGES.CLOSES_AT' : 'MESSAGES.OPENS_AT');
  })

  getChangeTime = computed<string>(()=>{
    const status = this.openStatus();
    if(!status || !status.changesAt) return '';
    const h = String(status.changesAt.getHours()).padStart(2, "0");
    const m = String(status.changesAt.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  })

  
  getTimeZone = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return 'Europe/Belgrade';
    return studio.timeZone;
  })
  

  openStatus = computed<OpenStatusResult | null>(()=>{
    const studio = this.studio();
    if(!studio) return null;
    return getStudioOpenStatus(studio.timeZone, studio.weeklySchedules, studio.exceptions);
  })

}
