import { Component, effect, inject, signal, untracked } from '@angular/core';
import { UserProvider } from '../../services/user/user';
import { Router } from '@angular/router';
import { Spinner } from "../../components/common/spinner/spinner";
import { Setup } from "./components/setup/setup";
import { UnifiedSingleProvider } from '../../services/unified/unified-single-provider';
import { isOwner } from '../../models/models';
import { Dashboard } from './components/dashboard/dashboard';

@Component({
  selector: 'app-my-studio',
  imports: [Spinner, Dashboard, Setup],
  templateUrl: './my-studio.html',
  styleUrl: './my-studio.css',
})
export class MyStudio {
  private readonly user = inject(UserProvider);
  private readonly router = inject(Router);
  private readonly singleProvider = inject(UnifiedSingleProvider);

  readonly pageState = signal<'setup' | 'dashboard' | 'loading'>('loading');
  
  private readonly owner = this.singleProvider.selected;


  ngOnInit(){
    this.user.testAuth()
    .subscribe({
      next: value => {
        if (value.status !== 'success' || !value.data) {
          this.router.navigate(['mystudio/login']);
        }
        const oid = this.user.owner_id();
        if(oid)
          this.singleProvider.select('owner', oid);
      },
      error: () => this.router.navigate(['mystudio/login'])
    });
  }

  constructor(){
    effect(() => {
      const owner = this.owner();
      if (!owner || !isOwner(owner)) return;

      this.pageState.set(
        owner.setupState !== 'COMPLETED'
          ? 'setup'
          : 'dashboard'
      );
    });
  }
}
