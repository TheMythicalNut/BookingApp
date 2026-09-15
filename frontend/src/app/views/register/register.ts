import { Component, computed, effect, inject, signal } from '@angular/core';
import { RequestState } from '../../models/models';
import { isValidEmail } from '../../util/email_validator';
import { isValidPassword } from '../../util/password_validator';
import { TranslationService } from '../../services/translation/translation';
import { UserProvider } from '../../services/user/user';
import { Router } from '@angular/router';
import { UtilityProvider } from '../../services/utility/utility-provider';
import { TextField } from "../../components/common/text-field/text-field";
import { TranslatePipe } from '../../pipes/translate-pipe';
import { Spinner } from "../../components/common/spinner/spinner";

@Component({
  selector: 'app-register',
  imports: [TextField, TranslatePipe, Spinner],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly translate = inject(TranslationService);
  private readonly user = inject(UserProvider);
  private readonly router = inject(Router);
  private readonly utility = inject(UtilityProvider);

  readonly pageState = signal<'register' | 'confirm'>('register');

  readonly userEmail = signal('');
  readonly validEmail = signal(false);

  readonly userPassword = signal('');
  readonly validPassword = signal(false);

  readonly userConfirmPassword = signal('');

  constructor(){
    this.user.testAuth().subscribe({
      next: (value)=>{
        if(value.status === 'success' && value.data === true)
          this.router.navigate(['mystudio'])
      }
    })

    effect(()=>{
      const email = this.user.email();
      if(email)
        this.userEmail.set(email);
    });
  }

  readonly registerRequest = signal<RequestState<Boolean>>({status: 'idle'});
  readonly resendRequest = signal<RequestState<Boolean>>({status: 'idle'});

  readonly emailValidator = (email: string): boolean => { return isValidEmail(email); }
  readonly passwordValidator = (password: string): boolean => { return isValidPassword(password).valid; }
  readonly confirmPasswordValidator = (ignorable: string) => { 
    const password = this.userPassword();
    const confirm = this.userConfirmPassword();
    return password === confirm;
  }

  readonly status = computed(()=>{
    const request = this.registerRequest()
    return request.status;
  })

  readonly getInvalidEmailMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.INVALID_EMAIL')
  });

  readonly getEmailInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.EMAIL')
  });

  readonly getEmailPlaceholder = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PLACEHOLDER.EMAIL')
  });

  readonly getInvalidPasswordMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.INVALID_PASSWORD')
  });

  readonly getPasswordInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.PASSWORD')
  });

  readonly getInvalidConfirmPasswordMessage = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.CONFIRM_PASSWORD_MISMATCH')
  });

  readonly getConfirmPasswordInputTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.CONFIRM_PASSWORD')
  });
  navigateTerms() {
    this.router.navigate(['tos']);
  }
  register(){
    if(!this.validEmail()) { this.registerRequest.set({status: 'error', error: 'invalid email'}); return; }
    if(!this.validPassword()) { this.registerRequest.set({status: 'error', error: 'invalid password'}); return; }
    if(this.userPassword() !== this.userConfirmPassword())
      { this.registerRequest.set({status: 'error', error: 'password mismatch' }); return; }
    
    const email = this.userEmail();
    const password = this.userPassword();
    
    this.utility.register(email, password).subscribe({
      next: (value)=>{ 
        this.registerRequest.set(value);
        if(value.status === 'success')
          this.pageState.set('confirm');
      },
      error: (err)=>{ this.resendRequest.set({status: 'error', error: err }); } 
    })
  }

  back(){
    this.pageState.set('register');
  }
}
