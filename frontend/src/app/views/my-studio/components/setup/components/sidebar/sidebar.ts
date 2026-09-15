import { Component, effect, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../../../../pipes/translate-pipe';
import { DashboardState, SetupState } from '../../../../../../models/models';
import { TranslationService } from '../../../../../../services/translation/translation';
import { UserProvider } from '../../../../../../services/user/user';
import { SetupService } from '../../../../../../services/setup-service/setup-service';

export type SetupStateDetails = {
  state : SetupState;
  details: 'empty' | 'modified' | 'invalid' | 'selected';
}

export type DashboardStateDetails = {
  state: DashboardState;
  details: 'empty' | 'selected';
}

@Component({
  selector: 'my-studio-sidebar',
  imports: [TranslatePipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly translate = inject(TranslationService);
  private readonly user = inject(UserProvider);
  readonly mode = signal<'navigation' | 'language'>('navigation');
  
  readonly type = input<'SETUP' | 'DASHBOARD'>('DASHBOARD');
  readonly options = input<SetupStateDetails[] | DashboardStateDetails[]>([]);
  readonly title = input<string>();
  readonly select = output<SetupState | DashboardState>();

  readonly isOpen = signal<boolean>(false);

  currentLanguage = this.translate.userLang
  readonly languages = this.translate.supported;

  readonly logoutHovered = signal<boolean>(false);
  
  onSelect(value: SetupState | DashboardState) {
    this.select.emit(value);
    this.isOpen.set(false);
  }

  onClose() {
    this.isOpen.set(false);
    this.mode.set('navigation');
  }

  onLanguage(){
    this.mode.set('language');
  }

  selectLanguage(language: string){
    this.translate.switchLanguage(language);
    this.onClose();
  }

  logout(){
    this.user.logout();
  }

}
