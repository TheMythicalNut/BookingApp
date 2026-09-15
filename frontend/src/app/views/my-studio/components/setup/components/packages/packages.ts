import { Component, computed, EffectRef, inject, output, Signal, signal } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { Button } from "../../../../../../components/common/button/button";
import { TextField } from "../../../../../../components/common/text-field/text-field";
import { Select } from "../../../../../../components/common/select/select";
import { CURRENCIES, setup_errors } from '../../../../../../CONST';
import { TextArea } from "../../../../../../components/common/text-area/text-area";
import { NumberField } from "../../../../../../components/common/number-field/number-field";
import { Multiselect } from "../../../../../../components/common/multiselect/multiselect";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { arraysEqual } from '../../../../../../util/arrays';
import { Package, RequestState, Service, Studio } from '../../../../../../models/models';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";


@Component({
  selector: 'setup-packages',
  imports: [Button, TextField, Select, TextArea, NumberField, Multiselect, ErrorMessage, RequestStatusMessage],
  templateUrl: './packages.html',
  styleUrl: './packages.css',
})
export class Packages {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setup = inject(SetupService);

  readonly next = output<void>();


  readonly saveRequestState = signal<RequestState<Package[]>>({ status: 'idle' });
  readonly requestStatus = computed(() => this.saveRequestState().status);
  

  readonly vm = this.setup.commerceVm;
  readonly pvm = this.setup.packagesVm;
  readonly studio = this.setup.profileVm;
  private effectRef!: EffectRef;

  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  readonly t = computed(() => {
    const _ = this.translate.userLang();
    const tr = (key: string) => this.translate.translate(key);

    return {
      title: tr('SETUP.PACKAGES.TITLE'),
      par1: tr('SETUP.PACKAGES.PAR1'),
      add: tr('SETUP.PACKAGES.ADD'),
      save: tr('BUTTON.SAVE'),
      next: tr('BUTTON.NEXT'),
      services: tr('SERVICES'),
      price: tr('SETUP.SERVICES.PRICE'),
      currency: tr('SETUP.SERVICES.CURRENCY'),
      name: tr('SETUP.PACKAGES.PACKAGE_NAME'),
      link: tr('SETUP.PACKAGES.PACKAGE_LINK'),
      linkPlaceholder: tr('SETUP.PACKAGES.PACKAGE_LINK_PLACEHOLDER'),
      description: tr('SETUP.PACKAGES.DESCRIPTION'),
      duration: tr('SETUP.SERVICES.DURATION'),
      package: tr('PACKAGE')
    };
  });

  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */

  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['packages']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

 
  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.PACKAGES.TITLE')
  });

  readonly errorBody = computed<string[]>(() => {
    const errorMessages = this.errors();      // Record<string, string>
    const validationErrors = this.pvm().form.errors;

    if (!validationErrors) { return [];}
    const errorList: string[] = [];

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (key === 'packages' && Array.isArray(value)) {
        value.forEach((packageError, index) => {
          if (!packageError) return;

          Object.keys(packageError).forEach(errorKey => {
            const message =  errorMessages[errorKey];
            if (message) {
              errorList.push(`${this.t().package} ${index + 1}: ${message}`);
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
    const form = this.pvm().form;
    const packages = this.pvm().value;

    const hasErrorsList = packages.map(() => false);

    const packageErrors = form.errors?.['packages'];

    if (!Array.isArray(packageErrors)) {
      return hasErrorsList;
    }

    packageErrors.forEach((error, index) => {
      if (error) {
        hasErrorsList[index] = true;
      }
    });

    return hasErrorsList;
  });
  
  readonly viewInvalid = computed(()=> this.pvm().state === 'invalid');
  
  readonly packages = computed<Package[]>(() => {
    return (this.vm().value.packages as Package[]) ?? [];
  });

  readonly services = computed<Service[]>(() => {
    const services = this.singleProvider.activeStudioServices();
    return services ?? [];
  });

  readonly currencies = CURRENCIES;

  readonly studioLink = computed<string>(() => {
    return ((this.studio().value.studioLink) ?? 'malavelora') + '/';
  })
  
  /* ---------------------------------------------------
     INDEXED MAPS (no .find in template)
  --------------------------------------------------- */

  readonly servicesById = computed(() =>
    new Map(this.services().map(s => [s.id, s]))
  );

  readonly serviceNameMap = computed(() => 
    new Map(this.services().map(s => [s.id, s.name]))
  )
  readonly serviceNameMapReverse = computed(() => 
    new Map(this.services().map(s => [s.name, s.id]))
  )
  readonly serviceNames = computed(() =>
    this.services().map(s => s.name).filter(Boolean)
  );

  readonly packageServiceNames = computed(()=>
    new Map(this.packages().map(p => {
      const serviceNames = p.services
        .filter(id => this.serviceNameMap().has(id))
        .map(id => this.serviceNameMap().get(id)) as string[];
      return [p.localID, serviceNames]
    }))
  )
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

  expand(localId: string): void {
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

  collapse(localId: string): void {
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

  toggleExpand(localId: string): void {
    this.isExpanded(localId)
      ? this.collapse(localId)
      : this.expand(localId);
  }

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */
    
  addPackage(){
    this.setup.addPackage();
  }
  removePackage(index: number){
    this.setup.removePackage(index);
  }

  setPackageName(i: number, v: string) {
    const current = this.packages()[i]?.name;
    if (current === v) return;
    this.setup.setPackageName(i, v);
  }
  setPacakgeLink(i: number, v: string) {
    const current = this.packages()[i]?.link;
    if (current === v) return;
    this.setup.setPackageLink(i, v);
  }
  setPackageCurrency(i: number, v: string) {
    const current = this.packages()[i]?.currency;
    if (current === v) return;
    this.setup.setPackageCurrency(i, v);
  }
  setPackagePrice(i: number, v: string) {
    const current = this.packages()[i]?.price;
    if (current === v) return;
    this.setup.setPackagePrice(i, v);
  }
  setPackageDescription(i: number, v: string) {
    const current = this.packages()[i]?.description;
    if (current === v) return;
    this.setup.setPackageDescription(i, v);
  }
  setPackageDuration(i: number, v: number | null): void {
    const pkg = this.packages()[i];
    if (!pkg) return;

    const current = pkg.duration;

    if (v === null && current === null) return;

    if (v !== null && current === v) return;

    this.setup.setPackageDuration(i, v ?? undefined);
  }

  setPackageServices(i: number, v: string[]){
    
    const current = this.packages()[i]?.services;
    const ids = v
      .filter(i => this.serviceNameMapReverse().has(i) )
      .map( i => this.serviceNameMapReverse().get(i) ) as string[];
    if(!ids) return;
    if (arraysEqual(current, ids)) return;

    this.setup.setPackageServices(i, ids);
  }

  save() {
    if (!this.viewInvalid()) {
      this.setup.savePackages().subscribe({
        next: (value) => {
          this.saveRequestState.set(value);
          if (value.status === 'success') {
            this.singleProvider.clearAll('package');
            value.data.forEach( i => this.singleProvider.update(i) );

            const active = this.singleProvider.activeStudio()!;
            const updatedStudio: Studio = { ...active, packages: value.data.map(i => i.id) };
            this.singleProvider.update(updatedStudio);

            this.setup.markAsSaved('packages');
          }
        },
        error: (err) => console.error(err),
      });
    }
  }
}