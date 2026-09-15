import {
  Component, signal, computed, effect, input, output,
  inject,
  ElementRef,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../services/translation/translation';

@Component({
  selector: 'app-date-select',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './date-select.html',
  styleUrl: './date-select.css',
})
export class DateSelect {
  private readonly translate = inject(TranslationService);
  
  // Core state
  readonly value = signal<string>(''); // yyyy-MM-dd
  readonly isOpen = signal<boolean>(false);
  readonly focused = signal<boolean>(false);
  readonly currentMonth = signal<Date>(this.startOfMonth(new Date()));

  readonly weekDays = this.translate.weekDays;
  readonly monthNames = this.translate.monthNames;

  // Inputs
  readonly init = input<string | undefined>();
  readonly hasClear = input<boolean>(false);
  readonly validator = input<((value: string) => boolean) | undefined>(
    undefined
  );
  readonly title = input<string>('');
  readonly placeholder = input<string>('Select date');
  readonly invalidMessage = input<string>('Invalid date');
  readonly required = input<boolean>(true);
  readonly min = input<string | undefined>();
  readonly max = input<string | undefined>();

  // Outputs
  readonly onChange = output<string>();
  readonly onClear = output<void>();
  readonly onValid = output<boolean>();

  constructor(private host: ElementRef<HTMLElement>) {
    // Initialize value
    effect(() => {
      const initial = this.init();
      if (initial) {
        this.value.set(initial);
        const parsed = this.parseISO(initial);
        if (parsed) this.currentMonth.set(this.startOfMonth(parsed));
      }
    });

    // Emit value changes
    effect(() => {
      this.onChange.emit(this.value());
    });

    // Emit validity if validator exists
    effect(() => {
      const validator = this.validator();
      if (!validator) return;
      this.onValid.emit(this.isValid());
    });
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  // Computed
  readonly hasValue = computed(() => this.value().length > 0);

  readonly isValid = computed(() => {
    const validator = this.validator();
    return validator ? validator(this.value()) : true;
  });

  readonly monthLabel = computed(() => {
    const date = this.currentMonth();
    const str = date.toLocaleString('default', {
      month: 'numeric',
      year: 'numeric',
    });
    const [month, year] = str.split('/');

    return this.monthNames()[parseInt(month)-1] + ' ' + year
  });

  readonly days = computed(() => this.generateCalendarDays());

  // Public API
  selectDate(date: Date): void {
    if (this.isDisabled(date)) return;
    const iso = this.toISO(date);
    this.value.set(iso);
    this.isOpen.set(false);
  }

  clear(): void {
    this.value.set('');
  }

  prevMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(
      new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  }

  nextMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(
      new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
    this.isOpen.set(true);
  }

  // Helpers
  private generateCalendarDays(): {
    date: Date;
    currentMonth: boolean;
  }[] {
    const monthStart = this.currentMonth();
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { date: Date; currentMonth: boolean }[] = [];

    // Previous month spill
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, currentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(year, month, d), currentMonth: true });
    }

    // Next month spill to complete grid (42 cells)
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      days.push({ date: next, currentMonth: false });
    }

    return days;
  }

  isSelected(date: Date): boolean {
    return this.value() === this.toISO(date);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  isDisabled(date: Date): boolean {
    const min = this.min();
    const max = this.max();
    const iso = this.toISO(date);

    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  formatDisplay(value: string): string {
    const parts = value.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return '';
    return d + '. ' + this.monthNames()[m - 1] + ' ' + y;
  }

  private toISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseISO(value: string): Date | null {
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}