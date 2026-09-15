import { Component, computed, inject, output, Signal, signal } from '@angular/core';
import { Button } from "../../../../../../components/common/button/button";
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { TranslationService } from '../../../../../../services/translation/translation';
import { NumberField } from "../../../../../../components/common/number-field/number-field";
import { Select } from "../../../../../../components/common/select/select";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { setup_errors } from '../../../../../../CONST';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { Discount, Package, RequestState, Service } from '../../../../../../models/models';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";


@Component({
  selector: 'setup-discounts',
  imports: [Button, NumberField, Select, ErrorMessage, RequestStatusMessage],
  templateUrl: './discounts.html',
  styleUrl: './discounts.css',
})
export class Discounts {
  private readonly translate = inject(TranslationService);
    private readonly singleProvider = inject(UnifiedSingleProvider);
    private readonly setup = inject(SetupService);

  readonly next = output<void>();
  readonly vm = this.setup.commerceVm;
  readonly dvm = this.setup.discountsVm;

  readonly saveRequestState = signal<RequestState<Discount[]>>({ status: 'idle' });
  readonly requestStatus = computed(() => this.saveRequestState().status);

  discountServiceValidator(value: string): boolean { return !!value; }
  discountPercentValidator(value: number | null): boolean { return !!value && value > 0 && value <=100;}
  
  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['discounts']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

 
  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.DISCOUNTS.TITLE')
  });

  readonly errorBody = computed<string[]>(() => {
    const errorMessages = this.errors();      // Record<string, string>
    const validationErrors = this.dvm().form.errors;

    if (!validationErrors) { return [];}
    const errorList: string[] = [];

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (key === 'discounts' && Array.isArray(value)) {
        value.forEach((categoryError, index) => {
          if (!categoryError) return;

          Object.keys(categoryError).forEach(errorKey => {
            const message =  errorMessages[errorKey];
            if (message) {
              errorList.push(`${this.getDiscountText()} ${index + 1}: ${message}`);
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
    const validationErrors = this.dvm().form.errors;
    const discounts = this.dvm().value;
    const hasErrorsList = discounts.map(i => false);
    if (!validationErrors) { return hasErrorsList; }

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (key === 'discounts' && Array.isArray(value)) {
        value.forEach((categoryError, index) => {
          if (!categoryError) return;
          hasErrorsList[index]= true;
        });
        return;
      }
    });

    return hasErrorsList;
  })

  readonly viewInvalid = computed(()=> this.dvm().state === 'invalid');
  
  readonly discounts = computed<Discount[]>(()=>{
    const vm = this.vm().value;
    return (vm.discounts as Discount[]) ?? [];
  })

  readonly services = computed<{id: string, name: string}[]>(()=>{
    const services = this.singleProvider.activeStudioServices();
    return services.map(i => ({id: i.id, name: i.name}));
  })

  readonly packages = computed<{id: string, name: string}[]>(()=>{
    const packages = this.singleProvider.activeStudioPackages();
    return packages.map(i => ({id: i.id, name: i.name}));
  })

  readonly articleNames = computed<string[]>(()=>{
    return [...this.services().map(i => i.name), ...this.packages().map(i => i.name)];
  })

  readonly getName = computed(()=>{
    const services = this.services();
    const packages = this.packages();
    return (article: { id: string, type: 'service' | 'package' } ) => 
      {
        return article.type === 'service' 
          ? services.find(it => it.id === article.id)?.name ?? ''
          : packages.find(it => it.id === article.id)?.name ?? ''
      }
  })
  
  readonly getTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.DISCOUNTS.TITLE');
  })
  
  readonly getPar1 = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.DISCOUNTS.PAR1');
  })

  readonly getAddButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.DISCOUNTS.ADD');
  })

  readonly getSaveButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.SAVE');
  })

  readonly getNextButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.NEXT');
  })

  readonly getDiscountText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.DISCOUNTS.DISCOUNT');
  })

  readonly getDiscountArticleText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.DISCOUNTS.ARTICLE');
  })
  readonly getDiscountPercentageText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.DISCOUNTS.PERCENTAGE');
  })

  addDiscount(){
    this.setup.addDiscount();
  }

  removeDiscount(index: number){
    const removed = this.discounts()[index];
    if (!removed) return;

    const id = removed.localID;

    this.collapse(id);
    this.setup.removeDiscount(index);
  }

  setDiscountPercentage(discountIndex: number, percentage: number | null){
    const current = this.discounts().at(discountIndex)?.percentage;
    if(current === null && percentage === null) return;
    if(percentage !== null && percentage === current) return;
    this.setup.setDiscountPercentage(discountIndex, percentage ?? undefined);
  }

  setDiscountArticle(discountIndex: number, article: string){
    const services = this.services();
    const packages = this.packages();
    let found = services.find(it => it.name === article);
    if(found){
      this.setup.setDiscountArticle(discountIndex, found.id, 'service');
      return;
    }
    found = packages.find(it => it.name === article);
    if(found){
      this.setup.setDiscountArticle(discountIndex, found.id, 'package');
    }
  }

  save() {
    if (!this.viewInvalid()) {
      this.setup.saveDiscounts().subscribe({
        next: (value) => {
          this.saveRequestState.set(value);
          if (value.status === 'success') {
            
            const services = this.singleProvider.activeStudioServices();
            const packages = this.singleProvider.activeStudioPackages();
            
            const discountServiceMap = new Map<string, number>(
              value.data
                .filter(d => d.article.type === 'service' && !!d.percentage)
                .map(d => [d.article.id, d.percentage!])
            ) 

            const discountPackageMap = new Map<string, number>(
              value.data
                .filter(d => d.article.type === 'package' && !!d.percentage)
                .map(d => [d.article.id, d.percentage!])
            )

            const updatedServices : Service[] = services.filter(s => discountServiceMap.has(s.id) ).map(s => ({...s, discount: discountServiceMap.get(s.id) ?? 0 }));
            const updatedPackages : Package[] = packages.filter(s => discountPackageMap.has(s.id) ).map(s => ({...s, discount: discountPackageMap.get(s.id) ?? 0 }));
            const updatedServicesRemovedDiscount: Service[] = services.filter(s => !discountServiceMap.has(s.id) && !!s.discount ).map(s => ({...s, discount: 0}));
            const updatedPackagesRemovedDiscount: Package[] = packages.filter(s => !discountPackageMap.has(s.id) && !!s.discount ).map(s => ({...s, discount: 0}));


            updatedServices.forEach(i => this.singleProvider.update(i) );
            updatedPackages.forEach(i => this.singleProvider.update(i) );
            updatedServicesRemovedDiscount.forEach(i => this.singleProvider.update(i) );
            updatedPackagesRemovedDiscount.forEach(i => this.singleProvider.update(i) );
            
            this.setup.markAsSaved('discounts');
          }
        },
        error: (err) => console.error(err),
      });
    }
  }
  /* ---------------------------------------------------
    EXPANSION STATE (Signal-Based)
  --------------------------------------------------- */

  readonly singleExpandMode = true;

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

  toggleExpansion(localId: string): void {
    this.isExpanded(localId)
      ? this.collapse(localId)
      : this.expand(localId);
  }
}
