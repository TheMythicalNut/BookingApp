// select.ts
import {
  Component, computed, effect, input, output, signal,
  HostListener, inject, ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { cyrToLat, normalizeBase } from '../../../util/search_utils';

type Validator = (value: any) => boolean;

@Component({
  selector: 'app-select',
  imports: [FormsModule],
  templateUrl: './select.html',
  styleUrl: './select.css',
})
export class Select {
  private el = inject(ElementRef);

  // ── internal state ──────────────────────────────────────────────────────────
  /** The committed/selected value (drives onChange) */
  readonly value = signal<string>('');
  /** Text currently typed in the input (autocomplete mode only) */
  readonly filterText = signal<string>('');
  readonly isOpen = signal<boolean>(false);

  // ── inputs ──────────────────────────────────────────────────────────────────
  readonly init         = input<string | null>();
  readonly validator    = input<Validator | undefined>(undefined);
  readonly title        = input<string>('');
  readonly placeholder  = input<string>('');
  readonly invalidMessage = input<string>('');
  readonly required     = input<boolean>(true);
  readonly options      = input<string[]>([]);
  readonly hasClear     = input<boolean>(false);
  readonly isAutocomplete = input<boolean>(false);

  // ── outputs ─────────────────────────────────────────────────────────────────
  readonly onChange = output<string>();
  readonly onClear  = output<void>();
  readonly onValid  = output<boolean>();

  constructor() {
    // Initialise value from parent
    effect(() => {
      const init = this.init();
      if (init) {
        this.value.set(init);
        this.filterText.set(init);
      }
    });

    // Emit validity whenever value changes
    effect(() => {
      const validator = this.validator();
      if (!validator) return;
      this.onValid.emit(validator(this.value()));
    });
  }

  // ── search index (built once when options change) ───────────────────────────
  readonly searchIndex = computed<Map<string, string[]>>(() => {
    const index = new Map<string, string[]>();
    for (const option of this.options()) {
      const normalized = normalizeBase(cyrToLat(option)).toLowerCase();
      // index every suffix starting position (simple substring index)
      for (let i = 0; i < normalized.length; i++) {
        const key = normalized.slice(i);
        if (!index.has(key)) index.set(key, []);
        index.get(key)!.push(option);
      }
    }
    return index;
  });

  // ── filtered options (autocomplete mode) ────────────────────────────────────
  readonly filteredOptions = computed<string[]>(() => {
    const filterRaw = this.filterText().trim();
    if (!filterRaw) return this.options().slice(0, 6);

    const filterVariants = new Set<string>();
    filterVariants.add(normalizeBase(cyrToLat(filterRaw)).toLowerCase());

    const index = this.searchIndex();
    const results = new Set<string>();

    for (const term of filterVariants) {
      for (const [key, matches] of index) {
        if (key.includes(term)) {
          for (const match of matches) {
            results.add(match);
            if (results.size >= 6) break;
          }
        }
        if (results.size >= 6) break;
      }
      if (results.size >= 6) break;
    }

    return Array.from(results).slice(0, 6);
  });

  // ── derived ─────────────────────────────────────────────────────────────────
  readonly hasValue = computed(() => this.value().length > 0);

  readonly isValid = computed(() => {
    const validator = this.validator();
    return validator ? validator(this.value()) : true;
  });

  /** Options shown in the dropdown */
  readonly displayedOptions = computed<string[]>(() =>
    this.isAutocomplete() ? this.filteredOptions() : this.options()
  );

  // ── interaction ─────────────────────────────────────────────────────────────
  selectOption(option: string) {
    this.value.set(option);
    this.filterText.set(option);   // keep input in sync
    this.onChange.emit(option);
    this.isOpen.set(false);
  }

  /** Called on every keystroke in autocomplete mode — only updates filterText */
  onFilterInput(text: string) {
    this.filterText.set(text);
    this.isOpen.set(true);
  }

  open() {
    this.isOpen.set(true);
  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  clear(event?: Event) {
    event?.stopPropagation();
    this.value.set('');
    this.filterText.set('');
    this.onClear.emit();
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      // If autocomplete and user typed something without selecting → restore committed value
      if (this.isAutocomplete()) {
        this.filterText.set(this.value());
      }
      this.isOpen.set(false);
    }
  }
}