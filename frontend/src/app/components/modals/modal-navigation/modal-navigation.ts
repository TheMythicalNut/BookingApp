import { Component, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../pipes/translate-pipe';
import { TranslationService } from '../../../services/translation/translation';
import { UnifiedSingleProvider } from '../../../services/unified/unified-single-provider';

@Component({
  selector: 'app-modal-navigation',
  imports: [TranslatePipe],
  templateUrl: './modal-navigation.html',
  styleUrl: './modal-navigation.css',
})
export class ModalNavigation {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);

  readonly isOpen = input<boolean>();
  readonly close = output<void>()
  readonly mode = signal<'navigation' | 'language'>('navigation');

  navigations: {name: string, dest: string}[] = [
    {name: 'NAVIGATIONS.HOME', dest: '/'},
    {name: 'NAVIGATIONS.MY_STUDIO', dest: '/mystudio'},
    {name: 'NAVIGATIONS.CONTACT', dest: '/contact'},
    {name: 'NAVIGATIONS.TOS', dest: '/tos'}
  ]

  currentLanguage = this.translate.userLang
  readonly languages = this.translate.supported;

  navigate(destination: string){
    this.singleProvider.clear(false);
    if(this.router.url === destination){
      this.close.emit();
    }
    this.resetScroll();
    this.router.navigate([destination]);
  }

  onLanguage(){
    this.mode.set('language');
  }

  selectLanguage(language: string){
    this.translate.switchLanguage(language);
    this.mode.set('navigation');
    this.close.emit();
  }


  
  resetScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }
}
