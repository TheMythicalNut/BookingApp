import { Component, computed, inject, output, Signal, signal } from '@angular/core';
import { Button } from "../../../../../../components/common/button/button";
import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { TextField } from "../../../../../../components/common/text-field/text-field";
import { 
  CdkDragDrop, CdkDrag, CdkDropList, CdkDragHandle, CdkDragPreview, CdkDragPlaceholder
} from '@angular/cdk/drag-drop';
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { setup_errors } from '../../../../../../CONST';
import { RequestState, Studio } from '../../../../../../models/models';
import { UnifiedSetter } from '../../../../../../services/unified/unified-setter';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";

interface Category {
  localID: string;
  name: string;
}

@Component({
  selector: 'setup-categories',
  imports: [Button, TextField, CdkDrag, CdkDropList, CdkDragHandle, CdkDragPreview, CdkDragPlaceholder, ErrorMessage, RequestStatusMessage],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private readonly translate = inject(TranslationService);
  private readonly setup = inject(SetupService);

  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setter = inject(UnifiedSetter);

  readonly next = output<void>();
  readonly vm = this.setup.commerceVm;
  readonly cvm = this.setup.categoriesVm;


  readonly saveRequestState = signal<RequestState<Category[]>>({ status: 'idle' });
  readonly requestStatus = computed(() => this.saveRequestState().status);


  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['categories']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

 
  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.CATEGORIES.TITLE')
  });

  readonly errorBody = computed<string[]>(() => {
    const errorMessages = this.errors();      // Record<string, string>
    const validationErrors = this.cvm().form.errors;

    if (!validationErrors) { return [];}
    const errorList: string[] = [];

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (key === 'categories' && Array.isArray(value)) {
        value.forEach((categoryError, index) => {
          if (!categoryError) return;

          Object.keys(categoryError).forEach(errorKey => {
            const message =  errorMessages[errorKey];
            if (message) {
              errorList.push(`${this.getCategoryText()} ${index + 1}: ${message}`);
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
    const validationErrors = this.cvm().form.errors;
    const categories = this.cvm().value;
    const hasErrorsList = categories.map(i => false);
    if (!validationErrors) { return hasErrorsList; }

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (key === 'categories' && Array.isArray(value)) {
        value.forEach((categoryError, index) => {
          if (!categoryError) return;
          hasErrorsList[index]= true;
        });
        return;
      }
    });

    return hasErrorsList;
  })
  
  readonly viewInvalid = computed(()=> this.cvm().state === 'invalid');
  
  private readonly refreshTrigger = signal(0);
  readonly categories = computed<Category[]>(()=>{
    const vm = this.vm().value;
    const _ = this.refreshTrigger()
    return (vm.categories as Category[]) ?? [];
  })
  
  readonly getTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.CATEGORIES.TITLE');
  })
  
  readonly getPar1 = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.CATEGORIES.PAR1');
  })

  readonly getAddButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.CATEGORIES.ADD');
  })

  readonly getSaveButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.SAVE');
  })

  readonly getNextButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.NEXT');
  })
  
  readonly getCategoryTitleText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.CATEGORY_NAME');
  })

  readonly getCategoryText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.CATEGORIES.CATEGORY');
  })
  
  readonly getDragHelperText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('MESSAGES.DRAG_TO_REORDER');
  })

  addCategory(){
    this.setup.addCategory();
  }
  removeCateogry(i: number){
    this.setup.removeCategory(i);
  }
  setCategory(i: number, v: string){
    this.setup.setCategory(i, v);
  }

  onCategoryDrop(event: CdkDragDrop<Category[]>) {
    if (event.previousIndex !== event.currentIndex) {
      this.setup.reorderCategory(event.previousIndex, event.currentIndex);
      this.refreshTrigger.update(v => v + 1);
    }
  }

  dragPredicate = () => true;
  
  save(){
    if(!this.viewInvalid()) {
      this.setup.saveCategories()
      .subscribe({
        next: (value)=>{
          this.saveRequestState.set(value);
          if(value.status === 'success'){
            const active = this.singleProvider.activeStudio()!;
            const services = this.singleProvider.activeStudioServices();

            const new_categories = value.data
            const update_studio : Studio = { ...active, categories: new_categories };
            this.singleProvider.update(update_studio);

            this.setup.markAsSaved('categories');
          } 
        },
        error: (err)=>{ console.error(err); }
      });
    }
  }
}
