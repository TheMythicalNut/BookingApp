import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  HostListener,
  ElementRef
} from '@angular/core';

@Component({
  selector: 'app-time-input',
  standalone: true,
  templateUrl: './time-input.html',
  styleUrls: ['./time-input.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeInput {
  // ====== INPUTS ======
  readonly value = input<string | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);
  readonly placeholder = input<string>('HH:MM');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(true);
  readonly min = input<string | undefined>(undefined);
  readonly max = input<string | undefined>(undefined);

  // ====== OUTPUT ======
  readonly change = output<string>();

  // ====== STATE ======
  readonly hours = signal<number | null>(null);
  readonly minutes = signal<number | null>(null);
  readonly isOpen = signal(false);
  readonly isFocused = signal(false);

  // ====== DERIVED ======
  readonly formatted = computed(() =>
    this.hours() !== null && this.minutes() !== null
      ? formatTime(this.hours()!, this.minutes()!)
      : ''
  );

  readonly error = computed<string | null>(() => {
    if (this.required() && !this.formatted()) return 'Time is required';
    const minMaxError = this.validateMinMax();
    return minMaxError ?? null;
  });

  readonly fieldClasses = computed(() => [
    'relative rounded-xl border transition-all duration-200 px-4 py-2 flex items-center justify-center cursor-pointer',
    this.isFocused() ? 'ring-2 ' + (this.error() ? 'ring-red-500' : 'ring-primary-500') : '',
    this.disabled() ? 'bg-neutral-100 cursor-not-allowed' : '',
    this.error() ? 'border-red-500' : 'border-neutral-300',
  ].join(' '));

  readonly labelClasses = computed(() => [
    'lora-400 text-xs transition-all duration-200',
    this.hours() !== null || this.minutes() !== null ? 'top-2' : 'top-4',
    this.error() ? 'text-red-500' : 'text-neutral-500'
  ].join(' '));

  // ====== OPTIONS ======
  readonly hoursList = Array.from({ length: 24 }, (_, i) => i);
  readonly minutesList = Array.from({ length: 12 }, (_, i) => i * 5);

  // ====== EFFECT: Sync external value ======
  constructor(private host: ElementRef<HTMLElement>) {
    effect(() => {
      const val = this.value();
      if (!val) {
        this.hours.set(null);
        this.minutes.set(null);
        return;
      }
      const parsed = parseTime(val);
      if (!parsed) return;
      this.hours.set(parsed.hours);
      this.minutes.set(parsed.minutes);
      this.emitIfValid();
    });
  }

  // =============================
  // INTERACTIONS
  // =============================
  toggle() {
    if (this.disabled()) return;
    this.isOpen.set(!this.isOpen());
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  selectTime(hour: number | null, minute: number | null) {
    if (hour !== null) this.hours.set(hour);
    if (minute !== null) this.minutes.set(minute);
    this.emitIfValid();
  }

  // =============================
  // VALIDATION
  // =============================
  private validateMinMax(): string | null {
    const current = this.formatted();
    if (!current) return null;
    if (this.min() && current < this.min()!) return `Time must be after ${this.min()}`;
    if (this.max() && current > this.max()!) return `Time must be before ${this.max()}`;
    return null;
  }

  private emitIfValid() {
    if (!this.error() && this.formatted()) this.change.emit(this.formatted());
  }

}

// =============================
// UTILITIES
// =============================
function parseTime(value: string): { hours: number; minutes: number } | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function formatTime(hours: number, minutes: number): string {
  return `${pad(hours)}:${pad(minutes)}`;
}

function pad(num: number) {
  return num.toString().padStart(2, '0');
}
