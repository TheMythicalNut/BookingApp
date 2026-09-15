import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-notify-message',
  imports: [],
  templateUrl: './notify-message.html',
  styleUrl: './notify-message.css',
})
export class NotifyMessage {
  readonly title = input<string>('');
  readonly body = input<string[]>([]);

  readonly singleError = computed<boolean>(() => {
    return this.body().length === 1;
  })
}
