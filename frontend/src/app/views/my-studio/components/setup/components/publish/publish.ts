import { Component, computed, inject, output, signal, Signal } from '@angular/core';
import { Button } from "../../../../../../components/common/button/button";
import { TranslationService } from '../../../../../../services/translation/translation';
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { setup_errors } from '../../../../../../CONST';
import { RequestState, Studio } from '../../../../../../models/models';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';

@Component({
  selector: 'setup-publish',
  imports: [Button, ErrorMessage, RequestStatusMessage],
  templateUrl: './publish.html',
  styleUrl: './publish.css',
})
export class Publish {
  private readonly translate = inject(TranslationService);
  private readonly setup = inject(SetupService);
  private readonly singleProvider = inject(UnifiedSingleProvider);

  readonly next = output<void>();

  readonly publishRequestState = signal<RequestState<Studio>>({status: 'idle'});
  readonly requestStatus = computed(() => this.publishRequestState().status);

  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */

  readonly errorTitle = computed<string>(() => {
    const state = this.setup.setupState();
    return state === 'invalid'
      ? this.formErrorTitle()
      : this.modifyTitle();
  });

  readonly formErrorTitle = computed<string>(() => {
    this.lang();
    return this.tr('ERRORS.SETUP.PUBLISH.TITLE_ERROR');
  });

  readonly modifyTitle = computed<string>(() => {
    this.lang();
    return this.tr('ERRORS.SETUP.PUBLISH.TITLE_ERROR');
  })



  private readonly error_lists = ['profile', 'location', 'media', 'schedule', 'exceptions', 'categories', 'services', 'packages', 'discounts', 'booking_rules'];
  private readonly vms = [this.setup.profileVm, this.setup.locationVm, this.setup.mediaVm, this.setup.scheduleVm, this.setup.exceptionsVm, this.setup.categoriesVm, this.setup.servicesVm, this.setup.packagesVm, this.setup.discountsVm, this.setup.bookingRulesVm];
  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    this.lang();

    const translated: Record<string, string> = Object.fromEntries(
      this.error_lists.flatMap(e => {
        const record = setup_errors[e];
        return Object.entries(record).map(([key, value]) => [key, this.tr(value)]);
      })
    );

    return translated;
  });

  readonly errorBody = computed<string[]>(() => {
    const errors = this.errors();

    return Object.keys(errors).reduce<string[]>((errorList, key) => {
      this.vms.forEach(vm => {
        const form = vm().form;
        if(form.hasError(key)){ errorList.push(errors[key]); }
      })
      return errorList;
    }, []);
  });

  readonly viewInvalid = computed(()=>  { 
    const state = this.setup.setupState();
    return  state !== 'empty';
  });

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */

  onPublish() { 
    if(!this.viewInvalid()){
      this.setup.publish()
      .subscribe({
        next: (value) => {
          this.publishRequestState.set(value);
          if(value.status === 'success'){
            this.singleProvider.update(value.data);
            this.singleProvider.reload();
            this.next.emit();
          }
        },
        error: (err)=>{
          console.error(err);
        }
      })
    }
   }

  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);
  
  readonly title = computed(()=>{
    this.lang();
    return this.tr('SETUP.PUBLISH.TITLE');
  })
  
  readonly par1 = computed(()=>{
    this.lang();
    return this.tr('SETUP.PUBLISH.PAR1');
  })

  readonly publishLabel = computed(() => {
    this.lang();
    return this.tr('BUTTON.PUBLISH')
  })
}