import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';


type Validator = (value: any) => boolean;

@Component({
  selector: 'app-text-field',
  imports: [FormsModule],
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
})
export class TextField {
  readonly value = signal<string>('');
  readonly focused = signal<boolean>(false);

  readonly init = input<string>();
  readonly validator = input<Validator | undefined>(undefined);
  readonly title = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalidMessage = input<string>('');
  readonly required = input<boolean>(true);
  
  readonly onChange = output<string>();
  readonly onValid = output<boolean>();

  readonly prefix = input<string>('');

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

  readonly hasValue = computed(()=>{
    const value = this.value();
    return !!value;
  })

  readonly isValid = computed(()=>{
    const value = this.value();
    const validator = this.validator();
    
    return validator? validator(value) : true;
  })

  setValue(value: string) {
    const prefix = this.prefix();
    if(prefix && value.startsWith(prefix))
      this.value.set(value.slice(prefix.length));
    else
      this.value.set(value);
  }
}
