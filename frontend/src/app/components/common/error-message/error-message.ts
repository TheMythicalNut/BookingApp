import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-error-message',
  imports: [],
  templateUrl: './error-message.html',
  styleUrl: './error-message.css',
})
export class ErrorMessage {
  readonly title = input<string>('');
  readonly body = input<string[]>([]);

  readonly singleError = computed<boolean>(() => {
    return this.body().length === 1;
  })
}
