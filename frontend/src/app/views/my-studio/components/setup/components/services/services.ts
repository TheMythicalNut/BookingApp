import {
  Component, computed, effect, inject, output, OnDestroy, EffectRef, signal,
  Signal,
} from '@angular/core';

import { Button } from "../../../../../../components/common/button/button";
import { Select } from "../../../../../../components/common/select/select";
import { NumberField } from "../../../../../../components/common/number-field/number-field";
import { TextField } from "../../../../../../components/common/text-field/text-field";
import { Multiselect } from "../../../../../../components/common/multiselect/multiselect";
import { MultiImageAction, MultiImageUpload } from "../../../../../../components/common/multi-image-upload/multi-image-upload";
import { SingleImageUpload } from "../../../../../../components/common/single-image-upload/single-image-upload";

import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupService } from '../../../../../../services/setup-service/setup-service';

import { CURRENCIES, SERVICE_TYPES, SERVICE_TYPES_REVERSE, setup_errors } from '../../../../../../CONST';
import { TextArea } from "../../../../../../components/common/text-area/text-area";
import { arraysEqual } from '../../../../../../util/arrays';
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { Category, RequestState, Service, Studio } from '../../../../../../models/models';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";

@Component({
  selector: 'setup-services',
  standalone: true,
  imports: [
    Button,
    Select,
    NumberField,
    TextField,
    Multiselect,
    MultiImageUpload,
    SingleImageUpload,
    TextArea,
    ErrorMessage,
    RequestStatusMessage
],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services implements OnDestroy {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setup = inject(SetupService);

  
  readonly next = output<void>();

  readonly saveRequestState = signal<RequestState<Service[]>>({ status: 'idle' });
  readonly requestStatus = computed(() => this.saveRequestState().status);
  
  readonly vm = this.setup.commerceVm;
  readonly svm = this.setup.servicesVm;
  readonly studio = this.setup.profileVm;
  private effectRef!: EffectRef;

  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  readonly t = computed(() => {
    const _ = this.translate.userLang();
    const tr = (key: string) => this.translate.translate(key);

    return {
      title: tr('SETUP.SERVICES.TITLE'),
      par1: tr('SETUP.SERVICES.PAR1'),
      add: tr('SETUP.SERVICES.ADD'),
      save: tr('BUTTON.SAVE'),
      next: tr('BUTTON.NEXT'),
      category: tr('SETUP.CATEGORIES.CATEGORY'),
      name: tr('SETUP.SERVICES.SERVICE_NAME'),
      link: tr('SETUP.SERVICES.SERVICE_LINK'),
      linkPlaceholder: tr('SETUP.SERVICES.SERVICE_LINK_PLACEHOLDER'),
      type: tr('SETUP.SERVICES.TYPE'),
      price: tr('SETUP.SERVICES.PRICE'),
      currency: tr('SETUP.SERVICES.CURRENCY'),
      duration: tr('SETUP.SERVICES.DURATION'),
      prereq: tr('SETUP.SERVICES.PREREQ'),
      description: tr('SETUP.SERVICES.DESCRIPTION'),
      thumbnail: tr('SETUP.SERVICES.THUMBNAIL'),
      thumbnailPlaceholder: tr('SETUP.SERVICES.THUMBNAIL_PLACEHOLDER'),
      gallery: tr('SETUP.SERVICES.GALLERY'),
      galleryPlaceholder: tr('SETUP.SERVICES.GALLERY_PLACEHOLDER'),
      service: tr('SERVICE')
    };
  });

  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */
  
  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['services']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

 
  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.SERVICES.TITLE')
  });


  readonly errorBody = computed<string[]>(() => {
    const errorMessages = this.errors();      // Record<string, string>
    const validationErrors = this.svm().form.errors;

    if (!validationErrors) { return [];}
    const errorList: string[] = [];

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (key === 'services' && Array.isArray(value)) {
        value.forEach((serviceError, index) => {
          if (!serviceError) return;

          Object.keys(serviceError).forEach(errorKey => {
            const message =  errorMessages[errorKey];
            if (message) {
              errorList.push(`${this.t().service} ${index + 1}: ${message}`);
            }
          });
        });
        return;
      }

      const message = errorMessages[key];
      if (message) {
        errorList.push(message);
      }
    });

    return errorList;
  });

  readonly hasErrorIndex = computed<boolean[]>(() => {
    const form = this.svm().form;
    const services = this.svm().value;

    const hasErrorsList = services.map(() => false);

    const serviceErrors = form.errors?.['services'];

    if (!Array.isArray(serviceErrors)) {
      return hasErrorsList;
    }

    serviceErrors.forEach((error, index) => {
      if (error) {
        hasErrorsList[index] = true;
      }
    });

    return hasErrorsList;
  });
  
  readonly viewInvalid = computed(()=> this.svm().state === 'invalid');
  
  readonly services = computed<Service[]>(() => {
    return (this.svm().value as Service[]) ?? [];
  });

  readonly categories = computed<Category[]>(() => {
    const categories = this.singleProvider.activeStudio()?.categories;
    return (categories) ?? [];
  });

  readonly currencies = CURRENCIES;

  readonly studioLink = computed<string>(() => {
    return ((this.studio().value.studioLink) ?? 'malavelora') + '/';
  })
  /* ---------------------------------------------------
     INDEXED MAPS
  --------------------------------------------------- */

  readonly servicesById = computed(() =>
    new Map(this.services().map(s => [s.localID, s]))
  );

  readonly serviceNameMap = computed(() => 
    new Map(this.services().map(s => [s.localID, s.name]))
  )
  readonly serviceNameMapReverse = computed(() => 
    new Map(this.services().map(s => [s.name, s.localID]))
  )
  readonly serviceNames = computed(() =>
    this.services().map(s => s.name).filter(Boolean)
  );

  readonly categoryNames = computed(() =>
    this.categories().map(c => c.name).filter(Boolean)
  );

  readonly galleryUrlMap = computed(()=>
    new Map<string, string[]>(
      this.services().map(s => [s.localID, s.gallery.map(g => g.url)])
    )
  )
  /* ---------------------------------------------------
     SERVICE TYPE TRANSLATION
  --------------------------------------------------- */
  readonly serviceTypeNames = computed(() => {
    const _ = this.translate.userLang();
    return Object.values(SERVICE_TYPES).map(v =>
      this.translate.translate(v)
    );
  });
  
  readonly serviceCategoryMap = computed(() => {
    const categories = this.categories();
    return new Map( categories.map(it => [it.id, it.name]));
  });

  readonly serviceTypeMap = computed(() => {
    const _ = this.translate.userLang();
    return new Map(
      Object.entries(SERVICE_TYPES).map(([key, value]) => [
        key,
        this.translate.translate(value) as string,
      ])
    );
  });
  
  readonly reverseServiceTypeMap = computed(() => {
    const _ = this.translate.userLang();
    return new Map(
      Object.entries(SERVICE_TYPES_REVERSE).map(([key, value]) => [
        this.translate.translate(key),
        value,
      ])
    );
  });

  readonly translatedServiceTypesById = computed(()=>{
    const map = this.serviceTypeMap();
    return new Map<string, string[]>(this.services().map(s => {
      const translated = s.type
        .map(id => map.get(id))
        .filter((name): name is string => !!name);
      return [s.localID, translated]
    })) 
  })

  /* ---------------------------------------------------
     THUMBNAIL URL CACHE
  --------------------------------------------------- */

  private readonly thumbnailUrlCache = new Map<string, string>();

  readonly thumbnailFileMap = computed(() => 
    new Map<string, File | null>(this.services().map(s =>
      [s.localID, s.thumbnail.file ?? null]
    ))
  )

  ngOnDestroy(): void {
    for (const url of this.thumbnailUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.thumbnailUrlCache.clear();
    this.effectRef.destroy();
  }

  /* ---------------------------------------------------
     CONSTRUCTOR
  --------------------------------------------------- */

  constructor() {
    this.effectRef = effect(() => {
      const services = this.services();

      for (const service of services) {
        const thumb = service.thumbnail;
        const existing = this.thumbnailUrlCache.get(service.localID);

        // No thumbnail object → revoke and skip
        if (!thumb) {
          if (existing) {
            URL.revokeObjectURL(existing);
            this.thumbnailUrlCache.delete(service.localID);
          }
          continue;
        }

        // If file exists → createObjectURL if not cached
        if (thumb.file instanceof Blob) {
          if (!existing) {
            const url = URL.createObjectURL(thumb.file);
            this.thumbnailUrlCache.set(service.localID, url);
          }
        } else {
          // No file → use provided URL (from backend)
          if (existing !== thumb.url) {
            if (existing) URL.revokeObjectURL(existing);
            this.thumbnailUrlCache.set(service.localID, thumb.url);
          }
        }
      }
    });
  }

  /* ---------------------------------------------------
    EXPANSION STATE (Signal-Based)
  --------------------------------------------------- */

  readonly singleExpandMode = false;

  private readonly expandedSingle = signal<string | null>(null);
  private readonly expandedMulti = signal<Set<string>>(new Set());

  isExpanded(localId: string): boolean {
    if (this.singleExpandMode) {
      return this.expandedSingle() === localId;
    }
    return this.expandedMulti().has(localId);
  }

  expandService(localId: string): void {
    if (this.singleExpandMode) {
      this.expandedSingle.set(localId);
      return;
    }

    this.expandedMulti.update(prev => {
      if (prev.has(localId)) return prev;
      const next = new Set(prev);
      next.add(localId);
      return next;
    });
  }

  collapseService(localId: string): void {
    if (this.singleExpandMode) {
      if (this.expandedSingle() !== localId) return;
      this.expandedSingle.set(null);
      return;
    }

    this.expandedMulti.update(prev => {
      if (!prev.has(localId)) return prev;
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
  }

  toggleService(localId: string): void {
    this.isExpanded(localId)
      ? this.collapseService(localId)
      : this.expandService(localId);
  }

  save() {
    if (!this.viewInvalid()) {
      this.setup.saveServices().subscribe({
        next: (value) => {
          this.saveRequestState.set(value);
          if (value.status === 'success') {
            this.singleProvider.clearAll('service');
            value.data.forEach( i => this.singleProvider.update(i) );

            const active = this.singleProvider.activeStudio()!;
            const updatedStudio: Studio = { ...active, services: value.data.map(i => i.id) };
            this.singleProvider.update(updatedStudio);

            this.setup.markAsSaved('services');
          }
        },
        error: (err) => console.error(err),
      });
    }
  }
  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */

  addService() {
    this.setup.addService();
  }

  removeService(index: number) {
    const removed = this.services()[index];
    if (!removed) return;

    const id = removed.localID;

    this.collapseService(id);
    this.setup.removeService(index);
  }

  setServiceCategory(i: number, name: string) {
    const v = this.categories().find(it => it.name === name)?.id;
    const current = (this.services()[i].category)
    if(!v || current === v) return;
    this.setup.setServiceCategory(i, v);
  }

  setServiceCurrency(i: number, v: string) {
    const current = this.services()[i]?.currency;
    if (current === v) return;
    this.setup.setServiceCurrency(i, v);
  }

  setServiceDuration(i: number, v: number | null): void {
    const service = this.services()[i];
    if (!service) return;

    const current = service.duration;

    if (v === null && current === null) return;

    if (v !== null && current === v) return;

    this.setup.setServiceDuration(i, v ?? undefined);
  }

  setServiceDescription(i: number, v: string) {
    const current = this.services()[i]?.description;
    if (current === v) return;
    this.setup.setServiceDescription(i, v);
  }

  setServiceName(i: number, v: string) {
    const current = this.services()[i]?.name;
    if (current === v) return;
    this.setup.setServiceName(i, v);
  }
  setServiceLink(i: number, v: string) {
    const current = this.services()[i]?.link;
    if (current === v) return;
    this.setup.setServiceLink(i, v);
  }

  setServicePrerequirement(i: number, v: string) {
    if(!(!!v)) return;
    const current = this.services()[i]?.prerequiredService;
    const id = this.serviceNameMapReverse().get(v);
    if(!id) return;
    if (current === id) return;
    this.setup.setServicePrerequirement(i, id);
  }
  clearServicePrerequirement(i: number) {
    const current = this.services()[i]?.prerequiredService;
    if(!current) return;
    this.setup.clearServicePrerequirement(i);
  }

  setServicePrice(i: number, v: string) {
    const current = this.services()[i]?.price;
    if (current === v) return;
    this.setup.setServicePrice(i, v);
  }

  setServiceTypes(i: number, translated: string[]) {
    const reverse = this.reverseServiceTypeMap();
    const normalized = translated.map(t => reverse.get(t) ?? t);

    const current = this.services()[i]?.type ?? [];

    if (arraysEqual(current, normalized)) return;

    this.setup.setServiceTypes(i, normalized);
  }

  setServiceThumbnail(i: number, file: File) {
    const current = this.services()[i]?.thumbnail.file;
    if (current === file) return;
    this.setup.setServiceThumbnailImage(i, file);
  }

  getThumbnailUrl(id: string): string | null {
    return this.thumbnailUrlCache.get(id) ?? null;
  }

  handleAction(serviceIndex: number, event: MultiImageAction) {
    switch (event.type) {
      case 'add':
          for (const file of event.files) {
            this.setup.addServiceGalleryImage(serviceIndex, file);
          }
        break;

      case 'remove':
        this.setup.removeServiceGalleryImage(serviceIndex, event.index);
        break;

      case 'reorder':
        this.setup.reorderServiceGalleryImages(serviceIndex, event.previousIndex, event.currentIndex)
        break;
    }
  }

}
