import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Validator = (value: any) => boolean;

@Component({
  selector: 'app-text-area',
  imports: [FormsModule],
  templateUrl: './text-area.html',
  styleUrl: './text-area.css',
})
export class TextArea {
  readonly value = signal<string>('');
  readonly focused = signal<boolean>(false);

  readonly init = input<string>();
  readonly validator = input<Validator | undefined>(undefined);
  readonly title = input<string>('');
  readonly placeholder = input<string>('');
  readonly maxLength = input<number>(255);
  readonly required = input<boolean>(true);
  
  readonly onChange = output<string>();
  readonly onValid = output<boolean>();

  constructor(){
    effect(()=>{
      const init = this.init();
      if(init) this.value.set(init);
    })
    effect(()=>{
      const value = this.value();
      this.onChange.emit(value);
    })
    effect(()=>{
      const valid = this.isValid();
      if(!this.validator()) return;
      this.onValid.emit(valid);
    })
  }

  
  readonly isValid = computed(()=>{
    const value = this.value();
    const validator = this.validator();
    
    return validator? validator(value) : true;
  })

  readonly hasValue = computed(()=>{
    const value = this.value();
    return !!value;
  })

  readonly length = computed(()=>{
    const value = this.value();
    return value.length;
  })

}
