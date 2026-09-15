import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hourLabel',
})
export class HourLabelPipe implements PipeTransform {

  transform(hour: number): string {
    if (hour === 0)  return '12 AM';
    if (hour < 12)   return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

}
