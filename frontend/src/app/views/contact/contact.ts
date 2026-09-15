import { Component, computed, effect, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { TranslationService } from '../../services/translation/translation';
import { Router } from '@angular/router';
import { isValidEmail } from '../../util/email_validator';
import { TranslatePipe } from '../../pipes/translate-pipe';
import { FormsModule } from '@angular/forms';
import { UserProvider } from '../../services/user/user';
import { TextInput } from "../../components/common/text-input/text-input";
import { TextArea } from "../../components/common/text-area/text-area";
import { TextField } from "../../components/common/text-field/text-field";
import { RequestStatusMessage } from "../../components/common/request-status-message/request-status-message";
import { UtilityProvider } from '../../services/utility/utility-provider';

export interface FAQ {
  QUESTION: string;
  ANSWER: string;
  questionLower: string;
  answerLower: string;
}

@Component({
  selector: 'app-contact',
  imports: [TranslatePipe, FormsModule, TextInput, TextArea, TextField, RequestStatusMessage],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private readonly translate = inject(TranslationService);
  private readonly user = inject(UserProvider);
  private readonly router = inject(Router);
  private readonly utility = inject(UtilityProvider);

  FAQs: FAQ[] = []
  filteredFAQs : FAQ[]= []

  // switch between FAQs and Direct
  isDirect: boolean = false;

  readonly search = signal('');
  
  readonly message = signal('');
  readonly userEmail = signal('');
  readonly validEmail = signal(false);

  readonly sendStatus = signal<'success' | 'error' | 'idle'>('idle');
  readonly isSending = signal<boolean>(false);

  searchChange(newValue: string) {
    this.search.set(newValue);
  }

  readonly searchPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.SEARCH');
  })

  
  constructor(){
    effect(()=>{
      const email = this.user.email();
      if(email)
        this.userEmail.set(email);
    });

    effect(()=>{
      const _ = this.translate.userLang();
      const faqs = this.translate.translate<FAQ[]>('FAQS.QUESTIONS');
      this.FAQs = faqs.map(faq => ({
        ...faq,
        questionLower: faq.QUESTION.toLowerCase(),
        answerLower: faq.ANSWER.toLowerCase()
      }));

      this.filteredFAQs = this.FAQs;
    })
    effect(()=>{
      const query = this.search();

      const value = query.trim().toLowerCase();
      if(!value){ 
        this.filteredFAQs = this.FAQs;
        return;
      }
      
      this.filteredFAQs = this.FAQs.filter(faq => (
        faq.questionLower.includes(value) ||
        faq.answerLower.includes(value)
      ))
    })
  }

  @HostListener('window:popstate')
  onBack() {
    if (this.isDirect) {
      // Restore local state instead of navigating
      this.isDirect = false;

      history.replaceState({ direct: false }, '');
    } else {
      // No internal state left → leave the page
      this.router.navigate(['']);
    }
  }

  toDirect() {
    this.isDirect = true;
    history.pushState({ direct: true }, '');
  }

  sendMessage() {
    const email = this.userEmail();
    const valid = this.validEmail();
    const message = this.message();
    if(!valid || !message.length) return;
    this.sendStatus.set('idle');
    this.isSending.set(true);

    this.user.setEmail(email);

    this.utility.sendQuestion(email, message).subscribe({
      next: (value) => {
        if(value.status === 'error') this.sendStatus.set('error');
        if(value.status === 'success') this.sendStatus.set('success');
        this.isSending.set(false);
      },
      error: (err)=>{ this.sendStatus.set('error'); this.isSending.set(false);}
    });
  }

  readonly emailValidator = (email: string): boolean => { return isValidEmail(email); }
  

  readonly getInvalidEmailMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.INVALID_EMAIL')
  })

  readonly getEmailInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.EMAIL')
  })

  readonly getEmailPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.EMAIL')
  })

  readonly getMessageInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.MESSAGE')
  })

  readonly getMessagePlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.MESSAGE')
  })
}
