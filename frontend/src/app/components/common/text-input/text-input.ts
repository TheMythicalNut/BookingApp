import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { cyrToLat, normalizeBase } from '../../../util/search_utils';

@Component({
  selector: 'app-text-input',
  imports: [FormsModule],
  templateUrl: './text-input.html',
  styleUrl: './text-input.css',
})
export class TextInput {
  readonly value = input<string>('');
  readonly changed = output<string>();
  readonly placeholder = input<string>('');
  readonly leadingIcon = input<'search' | 'location' | 'type' | 'timeslot' | 'filter' | 'custom' | 'none'>('none');
  readonly focused = signal(false);
  readonly options = input<string[]>([]);
  readonly selected = output<number>();
  readonly onFocus = output<void>();

  constructor(){
    effect(()=>{
      if(this.focused()) 
        this.onFocus.emit();
    });
  }
  
  readonly hasValue = computed(()=>{
    return this.value().trim() !== '';
  });

  private searchIndex = computed(() => {
    this.options();
    const index = new Map<string, Set<string>>();

    const addTerm = (term: string, original: string) => {
      if (!index.has(term)) index.set(term, new Set());
      index.get(term)!.add(original);
    };

    const addPrefixes = (term: string, original: string) => {
      for (let i = 1; i <= term.length; i++) {
        addTerm(term.slice(0, i), original);
      }
    };

    for (const option of this.options()) {
      const optionNorm = normalizeBase(cyrToLat(option).toLowerCase());
      addTerm(optionNorm, option);
      addPrefixes(optionNorm, option);
    }
    return index;
  });

  filteredOptions = computed<string[]>(() => {
    const filterRaw = this.value().trim();
    if (!filterRaw) return this.options().slice(0, 6);

    const filterVariants = new Set<string>();
    filterVariants.add(normalizeBase(cyrToLat(filterRaw)).toLowerCase());

    const index = this.searchIndex();
    const results = new Set<string>();

    for (const term of filterVariants) {
      const matches = index.get(term);
      if (matches) {
        for (const match of matches) {
          results.add(match);
          if (results.size >= 6) break;
        }
      }
      if (results.size >= 6) break;
    }

    return Array.from(results).slice(0, 6);
  });

  selectOption(option: string) {
    const currentOptions = this.options();
    const index = currentOptions.indexOf(option);
    if (index >= 0) {
      this.selected.emit(index);
    }
  }
}