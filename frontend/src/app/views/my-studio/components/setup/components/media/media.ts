import { Component, computed, inject, output, Signal, signal } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { Button } from "../../../../../../components/common/button/button";
import { SingleImageUpload } from "../../../../../../components/common/single-image-upload/single-image-upload";
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { isOwner, RequestState, Studio } from '../../../../../../models/models';
import { MultiImageAction, MultiImageUpload } from "../../../../../../components/common/multi-image-upload/multi-image-upload";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { setup_errors } from '../../../../../../CONST';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";

interface HeroImage {
  url: string,
  file: File | null
}
@Component({
  selector: 'setup-media',
  imports: [Button, SingleImageUpload, MultiImageUpload, ErrorMessage, RequestStatusMessage],
  templateUrl: './media.html',
  styleUrl: './media.css',
})
export class Media {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setup = inject(SetupService);

  readonly next = output<void>();
  readonly vm = this.setup.mediaVm;

  readonly saveRequestState = signal<RequestState<Studio>>({status: 'idle'});
  readonly requestStatus = computed(() => this.saveRequestState().status);
  
  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['media']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

 
  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.MEDIA.TITLE')
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
  
  readonly viewInvalid = computed(()=> this.vm().state === 'invalid');

  readonly thumbnail = computed(() => { 
    const file = this.vm().value.thumbnail;
    return file?.url ?? null;
  });

  readonly heroImages = computed<HeroImage[]>(() => {
    const files = this.vm().value.heroImages ?? [];

    return [
      ...files.map(hi => {
          return {
            file: hi.file,
            url: hi.file ? URL.createObjectURL(hi.file) : hi.url
          } as HeroImage
      })
    ]
  });

  readonly heroImageUrls = computed(()=>{
    const his = this.heroImages();
    return his.map(i => i.url);
  })

  get initImageUrls(): string[] {
    const owner = this.singleProvider.selected();
    if(!owner || !isOwner(owner)) return [];
    const studio = this.singleProvider.activeStudio();
    if(!studio) return [];
    return studio.heroImages.map(h => h.url);
  }

  setThumbnail(value: File){ this.setup.setThumbnail(value); }


  
  handleAction(event: MultiImageAction) {
    switch (event.type) {
      case 'add':
          this.setup.addHeroImages(event.files);
        break;
      case 'remove':
        this.setup.removeHeroImage(event.index);
        break;
      case 'reorder':
        this.setup.reorderHero(event.previousIndex, event.currentIndex)
        break;
    }
  }

  save(){
    if(!this.viewInvalid()) {
      this.setup.saveMedia()
      .subscribe({
        next: (value)=>{
          this.saveRequestState.set(value);
          if(value.status === 'success'){
            this.singleProvider.update(value.data);
            
            this.setup.markAsSaved('media');
          } 
        },
        error: (err)=>{ console.error(err); }
      });
    }
  }
  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);

  readonly title = computed(()=>{
    this.lang()
    return this.tr('SETUP.MEDIA.TITLE');
  })
  
  readonly par1 = computed(()=>{
    this.lang()
    return this.tr('SETUP.MEDIA.PAR1');
  })

  readonly saveLabel = computed(()=>{
    this.lang()
    return this.tr('BUTTON.SAVE');
  })

  readonly nextLabel = computed(()=>{
    this.lang()
    return this.tr('BUTTON.NEXT');
  })

  readonly thumbnailLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.THUMBNAIL');
  })

  readonly thumbnailPlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.THUMBNAIL');
  })

  readonly heroLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.HERO_IMAGES');
  })

  readonly heroPlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.HERO_IMAGES');
  })
}
