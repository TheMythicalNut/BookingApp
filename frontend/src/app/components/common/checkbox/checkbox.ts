// checkbox.component.ts
import { ChangeDetectionStrategy, Component, computed, contentChild, effect, ElementRef, forwardRef, HostBinding, HostListener, inject, input, model, output, signal, TemplateRef, untracked, viewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator, AbstractControl } from '@angular/forms';
import { ControlValueAccessor } from '@angular/forms';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxVariant = 'default' | 'filled' | 'outlined';
export type CheckboxColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type CheckboxLabelPosition = 'left' | 'right';
export type CheckboxState = 'checked' | 'unchecked' | 'indeterminate';

export interface CheckboxChangeEvent {
  checked: boolean;
  indeterminate: boolean;
  source: any;
}

export interface CheckboxGroupValue {
  [key: string]: boolean;
}

export interface CheckboxGroupItem {
  value: string;
  label: string;
  disabled?: boolean;
  checked?: boolean;
}

export interface CheckboxAccessibility {
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaErrorMessage?: string;
  ariaExpanded?: boolean;
}

let nextUniqueId = 0;

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Checkbox),
      multi: true
    }
  ]
})
export class Checkbox {
  readonly checked = input(false);
  readonly indeterminate = input(false);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  
  readonly checkedChange = output<boolean>();
  

  toggle(): void {
    if (this.disabled()) return;
    
    const checked = !this.checked();
  
    this.checkedChange.emit(checked);
  }
}