import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { HomeTopbarState } from '../../../../models/models';

@Component({
  selector: 'studio-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  readonly state = input<HomeTopbarState>(); // 'menu', 'modal', 'none'
  readonly logoPressed = output<void>();
  readonly menuPressed = output<void>();
  readonly sharePressed = output<void>();
  readonly isMenu = computed(() => this.state() === 'menu');
  readonly isModal = computed(() => this.state() === 'modal');
  readonly isNone = computed(() => this.state() === 'none');

  private readonly innerWidth = signal(window.innerWidth);

  onLogo(){
    this.logoPressed.emit();
  }
  onMenu(){
    this.menuPressed.emit();
  }
  onShare(){
    this.sharePressed.emit();
  }
  // Approx character threshold — tune to your font/size
  nameTooLong = computed(() => this.name().length > this.innerWidth() / 21);

  name = computed(()=>{
    const studio = this.singleProvider.activeStudio();
    if(!studio) return '';
    return studio.name;
  })
}
