import { Component, computed, effect, ElementRef, HostListener, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Validator = (value: any) => boolean;

@Component({
  selector: 'app-multiselect',
  imports: [FormsModule],
  templateUrl: './multiselect.html',
  styleUrl: './multiselect.css',
})
export class Multiselect {
  readonly value = signal<string[]>([]);
  readonly inputText = signal<string>('');
  readonly focusedInput = signal<boolean>(false);
  readonly focusedDropdown = signal<boolean>(false);

  readonly init = input<string[]>();
  readonly validator = input<Validator | undefined>(undefined);
  readonly title = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalidMessage = input<string>('');
  readonly required = input<boolean>(true);
  readonly options = input<string[]>([]); // predefined list

  readonly onChange = output<string[]>();
  readonly onValid = output<boolean>();

  constructor(private host: ElementRef<HTMLElement>) {
    // Initialize value
    effect(() => {
      const init = this.init();
      if (init) this.value.set([...init]);
    });

    // Emit value changes
    effect(() => this.onChange.emit(this.value()));

    // Emit validity
    effect(() => {
      const valid = this.isValid();
      if (!this.validator()) return;
      this.onValid.emit(valid);
    });
  }

  // Computed values
  readonly hasValue = computed(() => this.value().length > 0);

  readonly isValid = computed(() => {
    const validator = this.validator();
    return validator ? validator(this.value()) : true;
  });
  
  readonly focused = computed(() => {
    const d = this.focusedDropdown();
    const i = this.focusedInput();
    return i || d;
  });

  // Filtered options
  readonly filteredOptions = computed(() => {
    const filter = this.inputText().toLowerCase();
    return this.options().filter(opt =>
      !this.value().includes(opt) && opt.toLowerCase().includes(filter)
    );
  });

  // Input text getter/setter for ngModel
  get inputTextValue() {
    return this.inputText();
  }
  set inputTextValue(v: string) {
    this.inputText.set(v);
  }

  // Add option (from dropdown or free input)
  addOption(option?: string) {
    const val = (option ?? this.inputText()).trim();
    if (!val || this.value().includes(val)) return;
    this.value.set([...this.value(), val]);
    this.inputText.set('');
  }

  // Remove option
  removeOption(option: string, event?: MouseEvent) {
    if (event) event.stopPropagation(); // prevent triggering input focus
    this.value.set(this.value().filter(o => o !== option));
  }


  // Input change triggers recomputation (filteredOptions is reactive)
  onInputChange() {
    // no-op, reactive computed filteredOptions handles it
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.focusedDropdown.set(false);
      this.focusedInput.set(false);
    }
  }
}
