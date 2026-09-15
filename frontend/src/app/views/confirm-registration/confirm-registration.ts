import { Component, computed, inject, signal } from '@angular/core';
import { Spinner } from "../../components/common/spinner/spinner";
import { TranslatePipe } from '../../pipes/translate-pipe';
import { ActivatedRoute, Router } from '@angular/router';
import { UnifiedSetter } from '../../services/unified/unified-setter';
import { Owner, RequestState } from '../../models/models';

@Component({
  selector: 'app-confirm-registration',
  imports: [Spinner, TranslatePipe],
  templateUrl: './confirm-registration.html',
  styleUrl: './confirm-registration.css',
})
export class ConfirmRegistration {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private setter = inject(UnifiedSetter);

  readonly requestState = signal<RequestState<Owner>>(this.setter.idleState<'owner'>());
  readonly requestStatus = computed(() => this.requestState().status);
  readonly requestError = computed(() => { 
    const state = this.requestState();
    if(state.status !== 'error') return undefined;
    return state.error;
  });
  readonly requestOwner = computed(() => {
    const state = this.requestState();
    if(state.status !== 'success') return undefined;
    return state.data;
  })

  constructor(){
    this.requestRegisterConfirmation();
  }

  private requestRegisterConfirmation(){
    const token = this.route.snapshot.paramMap.get('token');
    if(!token) {this.requestState.set({ status: 'error', error: 'REGISTER_CONFIRMATION_URL_MISSING_TOKEN'}); return;}

    const request$ = this.setter.update('owner', { id: token, status: 'ACTIVE' });
    request$.subscribe({
      next: (value)=>{
        this.requestState.set(value);
      },
      error: (err) => {this.requestState.set({ status: 'error', error: 'REGISTER_CONFIRM_REQUEST_NOT_FOUND' }); return; }
    })
  }

  navigateLogin() {
    this.router.navigate(['mystudio/login']);
  }

}
