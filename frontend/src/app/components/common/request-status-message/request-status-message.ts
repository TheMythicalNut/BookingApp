import { Component, computed, effect, ElementRef, inject, input, signal } from '@angular/core';
import { TranslationService } from '../../../services/translation/translation';
import { Spinner } from "../spinner/spinner";

@Component({
  selector: 'app-request-status-message',
  imports: [Spinner],
  templateUrl: './request-status-message.html',
  styleUrl: './request-status-message.css',
})
export class RequestStatusMessage {
  private readonly translate = inject(TranslationService);
  private el = inject(ElementRef<HTMLElement>);

  readonly status = input<'success' | 'loading' | 'error' | 'idle'>('idle');
  readonly activeStatus = signal<'success' | 'loading' | 'error' | 'idle'>('idle');

  constructor(){
    effect(()=>{
      const status = this.status();
      this.activeStatus.set(status);
      if(status !== 'idle'){
        this.el.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }
    })
  }

  readonly isIdle = computed(()=>{
    const status = this.activeStatus();
    return status === 'idle'
  })

  readonly isLoading = computed(()=>{
    const status = this.activeStatus();
    return status === 'loading';
  })

  readonly isSuccess = computed(()=>{
    const status = this.activeStatus();
    return status === 'success';
  })
  
  readonly isFail = computed(()=>{
    const status = this.activeStatus();
    return status === 'error';
  })

  readonly getSuccessTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('REQUEST_STATUS.SUCCESS.TITLE');
  })
  readonly getSuccessMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('REQUEST_STATUS.SUCCESS.BODY');
  })

  readonly getFailTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('REQUEST_STATUS.FAILED.TITLE');
  })

  readonly getFailMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('REQUEST_STATUS.FAILED.BODY');
  })

  reset(){
    if(!this.isLoading())
    this.activeStatus.set('idle');
  }
}
