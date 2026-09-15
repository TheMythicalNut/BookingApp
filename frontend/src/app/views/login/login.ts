import { Component, computed, effect, inject, signal } from '@angular/core';
import { isValidEmail } from '../../util/email_validator';
import { TranslationService } from '../../services/translation/translation';
import { UserProvider } from '../../services/user/user';
import { TextField } from "../../components/common/text-field/text-field";
import { isValidPassword } from '../../util/password_validator';
import { Owner, RequestState } from '../../models/models';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate-pipe';
import { Spinner } from "../../components/common/spinner/spinner";
import { LoginData, UtilityProvider } from '../../services/utility/utility-provider';
import { RequestStatusMessage } from "../../components/common/request-status-message/request-status-message";

@Component({
  selector: 'app-login',
  imports: [TextField, TranslatePipe, Spinner, RequestStatusMessage],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly translate = inject(TranslationService);
  private readonly user = inject(UserProvider);
  private readonly router = inject(Router);
  private readonly utility = inject(UtilityProvider);

  readonly userEmail = signal('');
  readonly validEmail = signal(false);

  readonly userPassword = signal('');
  readonly validPassword = signal(false);

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

    effect(()=>{
      const lr = this.loginRequest();
      if(lr.status === 'success' && !!lr.data.token && !!lr.data.owner){
        this.user.setToken(lr.data.token);
        this.user.setOwner(lr.data.owner);
        this.router.navigate(['mystudio'])
      }
    })
  }

  readonly loginRequest = signal<RequestState<LoginData>>({status: 'idle'});

  readonly emailValidator = (email: string): boolean => { return isValidEmail(email); }
  readonly passwordValidator = (password: string): boolean => { return isValidPassword(password).valid; }

  readonly status = computed(()=>{
    const request = this.loginRequest();
    return request.status;
  });

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

  navigateRegister(){
    this.router.navigate(['mystudio/register']);
  };

  login(){
    if(!this.validEmail()) { this.loginRequest.set({status: 'error', error: 'invalid email'}); return; }
    if(!this.validPassword()) { this.loginRequest.set({status: 'error', error: 'invalid password'}); return; }
    const email = this.userEmail();
    const password = this.userPassword();
    this.utility.login(email, password).subscribe({
      next: (value)=> {
        this.loginRequest.set(value);
      },
      error: (err)=>{ this.loginRequest.set({status: 'error', error: 'unknown error'})}
    })
  }
}
