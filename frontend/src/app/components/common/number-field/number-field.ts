import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Validator = (value: number | null) => boolean;

@Component({
  selector: 'app-number-field',
  imports: [FormsModule],
  templateUrl: './number-field.html',
  styleUrl: './number-field.css',
})
export class NumberField {
  readonly value = signal<number | null>(null);
  readonly focused = signal<boolean>(false);

  readonly init = input<number | null>(null);
  readonly validator = input<Validator | undefined>(undefined);
  readonly title = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalidMessage = input<string>('');
  readonly required = input<boolean>(true);
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly step = input<number>(1);

  readonly onChange = output<number | null>();
  readonly onValid = output<boolean>();

  constructor() {
    effect(() => {
      const init = this.init();
      if (init !== null && init !== undefined) {
        this.value.set(init);
      }
    });

    effect(() => {
      this.onChange.emit(this.value());
    });

    effect(() => {
      if (!this.validator()) return;
      this.onValid.emit(this.isValid());
    });
  }

  readonly hasValue = computed(() => {
    return this.value() !== null && this.value() !== undefined;
  });

  readonly isValid = computed(() => {
    const value = this.value();
    const validator = this.validator();

    if (!this.required() && (value === null || value === undefined)) {
      return true;
    }

    return validator ? validator(value) : true;
  });

  setValue(raw: string) {
    if (raw === '' || raw === null) {
      this.value.set(null);
      return;
    }

    const parsed = Number(raw);
    this.value.set(Number.isNaN(parsed) ? null : parsed);
  }

  clear() {
    this.value.set(null);
  }
}
