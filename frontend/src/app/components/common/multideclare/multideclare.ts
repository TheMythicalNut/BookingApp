import { Component, computed, effect, ElementRef, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
type Validator = (value: any) => boolean;

@Component({
  selector: 'app-multideclare',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './multideclare.html',
  styleUrl: './multideclare.css',
})
export class Multideclare {

  readonly value = signal<string[]>([]);
  readonly inputText = signal<string>('');
  readonly focusedInput = signal<boolean>(false);

  readonly init = input<string[]>();
  readonly validator = input<Validator | undefined>(undefined);
  readonly title = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalidMessage = input<string>('');
  readonly required = input<boolean>(true);

  readonly onChange = output<string[]>();
  readonly onValid = output<boolean>();

  constructor(private host: ElementRef<HTMLElement>) {
    effect(() => {
      const init = this.init();
      if (init) this.value.set([...init]);
    });

    effect(() => this.onChange.emit(this.value()));

    // Emit validity
    effect(() => {
      const validator = this.validator();
      if (!validator) return;
      this.onValid.emit(this.isValid());
    });
  }

  readonly hasValue = computed(() => this.value().length > 0);

  readonly isValid = computed(() => {
    const validator = this.validator();
    return validator ? validator(this.value()) : true;
  });

  readonly focused = computed(() => this.focusedInput());

  get inputTextValue() {
    return this.inputText();
  }
  set inputTextValue(v: string) {
    this.inputText.set(v);
  }

  addOption() {
    const val = this.inputText().trim();
    if (!val || this.value().includes(val)) return;

    this.value.set([...this.value(), val]);
    this.inputText.set('');
  }

  removeOption(option: string, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.value.set(this.value().filter(o => o !== option));
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.focusedInput.set(false);
    }
  }
}
