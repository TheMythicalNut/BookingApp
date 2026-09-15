import { Component, computed, input, output } from '@angular/core';
import { HomeTopbarState } from '../../../../models/models';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  readonly state = input<HomeTopbarState>(); // 'menu', 'modal', 'none'
  readonly logoPressed = output<void>();
  readonly menuPressed = output<void>();
  readonly isMenu = computed(() => this.state() === 'menu');
  readonly isModal = computed(() => this.state() === 'modal');
  readonly isNone = computed(() => this.state() === 'none');

  onLogo(){
    this.logoPressed.emit();
  }
  onMenu(){
    this.menuPressed.emit();
  }
}
