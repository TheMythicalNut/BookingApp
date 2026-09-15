import { Component, computed, inject, output, Signal, signal } from '@angular/core';
import { ReactiveFormsModule} from '@angular/forms';
import { TranslationService } from '../../../../../../services/translation/translation';
import { Button } from "../../../../../../components/common/button/button";
import { TextField } from "../../../../../../components/common/text-field/text-field";
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { Multiselect } from "../../../../../../components/common/multiselect/multiselect";
import { setup_errors, STUDIO_TYPES } from '../../../../../../CONST';
import { arraysEqual } from '../../../../../../util/arrays';
import { isValidEmail, isValidFacebookLink, isValidInstagramLink, isValidPhone } from '../../../../../../util/email_validator';
import { Multideclare } from "../../../../../../components/common/multideclare/multideclare";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { RequestState, Studio } from '../../../../../../models/models';
import { UnifiedSetter } from '../../../../../../services/unified/unified-setter';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";

@Component({
  selector: 'setup-profile',
  imports: [ReactiveFormsModule, Button, TextField, Multiselect, Multideclare, ErrorMessage, RequestStatusMessage],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly translate = inject(TranslationService);
  private readonly setup = inject(SetupService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setter = inject(UnifiedSetter);

  readonly saveRequestState = signal<RequestState<Studio>>(this.setter.idleState<'studio'>());
  readonly requestStatus = computed(() => this.saveRequestState().status);

  readonly next = output<void>();
  readonly vm = this.setup.profileVm;

  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */


  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.PROFILE.TITLE')
  });

  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['profile']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

  readonly errorBody = computed<string[]>(() => {
    const errors = this.errors();
    const form = this.vm().form;

    return Object.keys(errors).reduce<string[]>((errorList, key) => {
      if (form.hasError(key)) {
        errorList.push(errors[key]);
      }
      return errorList;
    }, []);
  });
  
  readonly view = computed(() => this.vm().value);

  readonly viewInvalid = computed(()=> this.vm().state === 'invalid');

  readonly studioTypes = Object.keys(STUDIO_TYPES);

  readonly studioTypeOptions = computed(() => {
    this.lang();

    return this.studioTypes.map(id => ({
      id,
      label: this.translate.getStudioTypeName([id])
    }));
  });

  readonly studioTypeOptionsLabels = computed(()=> this.studioTypeOptions().map(it => it.label))

  readonly studioTypeMap = computed(() => new Map<string, string>(this.studioTypeOptions().map(it => [it.id, it.label])))

  readonly studioTypeName = computed(
    () => (this.view().studioTypes ?? []).map(id => this.studioTypeMap().get(id)).filter(Boolean) as string[],
    { equal: (a, b) => arraysEqual(a ?? [], b ?? []) }
  );
  
  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */

  setStudioName(value: string){ 
    if(this.view().studioName === value) return;
    this.setup.setStudioName(value);
  }
  setStudioLink(value: string){
    if(this.view().studioLink === value) return;
    this.setup.setStudioLink(value);
  }
  setStudioType(value: string[]){
    if(arraysEqual(this.view().studioTypes ?? [], value)) return;
    this.setup.setStudioTypes(
      value.map(s => {
        const tn = this.studioTypeOptionsLabels();
        return this.studioTypes.at(tn.indexOf(s))!
      })
    ); 
  }
  setInstagram(value: string){ 
    if(this.view().instagram === value) return;
    this.setup.setInstagram(value); 
  }
  setFacebook(value: string){ 
    if(this.view().facebook === value) return;
    this.setup.setFacebook(value);
  }
  setContactEmail(value: string){ 
    if(this.view().contactEmail === value) return;
    this.setup.setContactEmail(value); 
  }
  setContactPhone(value: string){
    if(this.view().contactPhone === value) return;
    this.setup.setContactPhone(value);
  }
  setWhatsapp(value: string){ 
    if(this.view().whatsappPhone === value) return;
    this.setup.setWhatsappPhone(value);
  }

  setSearchTags(value: string[]) {
    if(arraysEqual(this.view().searchTags ?? [], value)) return;
    this.setup.setSearchTags(value);
  }


  save(){
    if(!this.viewInvalid()) {
      this.setup.saveProfile()
      .subscribe({
        next: (value)=>{
          this.saveRequestState.set(value);
          if(value.status === 'success'){
            this.singleProvider.update(value.data);
            
            this.setup.markAsSaved('profile');
          } 
        },
        error: (err)=>{ console.error(err); }
      });
    }
  }

  /* ---------------------------------------------------
     VALIDATORS
  --------------------------------------------------- */
  studioNameValidator = (value: string) : boolean => { return value.length >= 3; }
  studioLinkValidator = (value: string) : boolean => { return value.length >= 3; }
  studioTypeValidator = (value: string[]): boolean => { return value.length >= 1; }
  studioContactEmailValidator = (value: string): boolean => { return isValidEmail(value); }
  studioContactPhoneValidator = (value: string): boolean => { return isValidPhone(value); }
  studioContactWAPhoneValidator = (value: string): boolean => { return !(!!value) || isValidPhone(value); }
  studioInstagramLinkValidator = (value: string): boolean => { return !(!!value) || isValidInstagramLink(value); }
  studioFacebookLinkValidator = (value: string): boolean => { return !(!!value) || isValidFacebookLink(value); }

  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);

  readonly title = computed(() => {
    this.lang();
    return this.tr('SETUP.PROFILE.TITLE');
  });

  readonly par1 = computed(() => {
    this.lang();
    return this.tr('SETUP.PROFILE.PAR1');
  });

  readonly saveLabel = computed(() => {
    this.lang();
    return this.tr('BUTTON.SAVE');
  });

  readonly nextLabel = computed(() => {
    this.lang();
    return this.tr('BUTTON.NEXT');
  });

  readonly nameLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.STUDIO_NAME');
  });

  readonly linkLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.STUDIO_LINK')
  })

  readonly namePlaceholder = computed(() => {
    this.lang();
    return this.tr('PLACEHOLDER.STUDIO_NAME');
  });

  readonly linkPlaceholder = computed(() => {
    this.lang();
    return this.tr('PLACEHOLDER.STUDIO_LINK')
  })

  readonly typeLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.STUDIO_TYPE');
  });

  readonly instagramLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.INSTAGRAM');
  });

  readonly instagramPlaceholder = computed(() => {
    this.lang();
    return this.tr('PLACEHOLDER.INSTAGRAM');
  });

  readonly facebookLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.FACEBOOK');
  });

  readonly facebookPlaceholder = computed(() => {
    this.lang();
    return this.tr('PLACEHOLDER.FACEBOOK');
  });

  readonly emailLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.CONTACT_EMAIL');
  });

  readonly emailPlaceholder = computed(() => {
    this.lang();
    return this.tr('PLACEHOLDER.EMAIL');
  });

  readonly phoneLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.CONTACT_PHONE');
  });

  readonly phonePlaceholder = computed(() => {
    this.lang();
    return this.tr('PLACEHOLDER.PHONE');
  });

  readonly whatsappLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.WHATSAPP');
  });
  readonly searchTagsLabel = computed(() => {
    this.lang();
    return this.tr('TEXTFIELD_TITLES.SEARCH_TAGS')
  })
}