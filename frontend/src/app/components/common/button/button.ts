import { Component, computed, input, output } from '@angular/core';
import { Spinner } from "../spinner/spinner";


// blue, red, green, yellow
const _safelist = `
bg-blue-100 bg-blue-200 bg-blue-300 bg-blue-400 bg-blue-500 bg-blue-600 bg-blue-700
text-blue-100 text-blue-200 text-blue-300 text-blue-400 text-blue-500 text-blue-600 text-blue-700
from-blue-400 to-blue-600
border-blue-500 border-blue-200
focus:ring-blue-500
bg-red-100 bg-red-200 bg-red-300 bg-red-400 bg-red-500 bg-red-600 bg-red-700
text-red-100 text-red-200 text-red-300 text-red-400 text-red-500 text-red-600 text-red-700
from-red-400 to-red-600
border-red-500 border-red-200
focus:ring-red-500
bg-green-100 bg-green-200 bg-green-300 bg-green-400 bg-green-500 bg-green-600 bg-green-700
text-green-100 text-green-200 text-green-300 text-green-400 text-green-500 text-green-600 text-green-700
from-green-400 to-green-600
border-green-500 border-green-200
focus:ring-green-500
bg-yellow-100 bg-yellow-200 bg-yellow-300 bg-yellow-400 bg-yellow-500 bg-yellow-600 bg-yellow-700
text-yellow-100 text-yellow-200 text-yellow-300 text-yellow-400 text-yellow-500 text-yellow-600 text-yellow-700
from-yellow-400 to-yellow-600
border-yellow-500 border-yellow-200
focus:ring-yellow-500
hover:bg-blue-200 hover:bg-blue-500 hover:bg-red-200 hover:bg-red-500 hover:bg-green-200 hover:bg-green-500 hover:bg-yellow-200 hover:bg-yellow-500
hover:text-white
hover:opacity-90 hover:shadow-lg hover:shadow-xl hover:brightness-105 hover:scale-105
active:bg-blue-300 active:bg-blue-600 active:bg-red-300 active:bg-red-600 active:bg-green-300 active:bg-green-600 active:bg-yellow-300 active:bg-yellow-600
active:brightness-90
disabled:bg-blue-50 disabled:text-blue-300 disabled:border-blue-200
disabled:bg-red-50 disabled:text-red-300 disabled:border-red-200
disabled:bg-green-50 disabled:text-green-300 disabled:border-green-200
disabled:bg-yellow-50 disabled:text-yellow-300 disabled:border-yellow-200
`;

type ButtonType = 'primary' | 'secondary' | 'outline';

@Component({
  selector: 'app-button',
  imports: [Spinner],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  readonly status = input<'loading' | 'error' | 'idle'>('idle');
  readonly idleText = input<string>('button');
  readonly errorText = input<string>('error');
  readonly disabled = input<boolean>(false);
  readonly type = input<ButtonType>('primary');
  readonly tint = input<string | undefined>(undefined); 
  
  readonly action = output<void>();

  onAction(){
    this.action.emit();
  }

  readonly buttonClass = computed(() => {
    const tint = this.tint?.() ?? undefined;
    const type = this.type();

    const base = 'relative w-24 h-5 font-medium rounded-md text-center overflow-hidden transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 active:shadow-inner disabled:opacity-50 group transform cursor-pointer';

    if (!tint) {
      switch (type) {
        case 'primary':
          return base + ' bg-gradient-to-r from-[var(--tertiary-color)] to-[var(--primary-color)] text-white' +
            ' hover:opacity-90 hover:shadow-xl hover:scale-101 hover:brightness-105' +
            ' focus:ring-[var(--tertiary-color)]' +
            ' active:brightness-90';

        case 'secondary':
          return base + ' bg-[var(--tertiary-color)]/10 text-[var(--tertiary-color)]' +
            ' hover:bg-[var(--tertiary-color)]/20 hover:shadow-lg hover:scale-101' +
            ' focus:ring-[var(--tertiary-color)]' +
            ' active:bg-[var(--tertiary-color)]/30' +
            ' disabled:bg-[var(--tertiary-color)]/5 disabled:text-[var(--tertiary-color)]/40';

        case 'outline':
          return base + ' bg-transparent border-2 border-[var(--tertiary-color)] text-[var(--tertiary-color)]' +
            ' hover:bg-[var(--tertiary-color)] hover:text-white hover:shadow-lg hover:scale-101' +
            ' focus:ring-[var(--tertiary-color)]' +
            ' active:bg-[var(--primary-color)]' +
            ' disabled:border-[var(--tertiary-color)]/30 disabled:text-[var(--tertiary-color)]/30 disabled:hover:bg-transparent';
      }
    }

    switch (type) {
      case 'primary':
        return base + ` bg-gradient-to-r from-${tint}-400 to-${tint}-600 text-white` +
          ' hover:opacity-90 hover:shadow-xl hover:scale-101 hover:brightness-105' +
          ` focus:ring-${tint}-500` +
          ' active:brightness-90';

      case 'secondary':
        return base + ` bg-${tint}-100 text-${tint}-700` +
          ` hover:bg-${tint}-200 hover:shadow-lg hover:scale-101` +
          ` focus:ring-${tint}-500` +
          ` active:bg-${tint}-300` +
          ` disabled:bg-${tint}-50 disabled:text-${tint}-300`;

      case 'outline':
        return base + ` bg-transparent border-2 border-${tint}-500 text-${tint}-600` +
          ` hover:bg-${tint}-500 hover:text-white hover:shadow-lg hover:scale-101` +
          ` focus:ring-${tint}-500` +
          ` active:bg-${tint}-600` +
          ` disabled:border-${tint}-200 disabled:text-${tint}-200 disabled:hover:bg-transparent`;
    }
  });

}
