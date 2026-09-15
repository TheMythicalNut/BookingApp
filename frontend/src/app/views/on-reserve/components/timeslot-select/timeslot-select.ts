import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Selectable, UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { UserProvider } from '../../../../services/user/user';
import { isPackage, isService } from '../../../../models/models';
import { getZonedNow, minutesToTime, toMinutes } from '../../../../util/studio_hours';
import { dateToYYYYMMDD, isSameDay } from '../../../../util/studio_days';

@Component({
  selector: 'reserve-timeslot-select',
  imports: [],
  templateUrl: './timeslot-select.html',
  styleUrl: './timeslot-select.css',
})
export class TimeslotSelect {
  private readonly user = inject(UserProvider);
  private readonly singleProvider = inject(UnifiedSingleProvider);

  readonly selected = output<string | null>();
  

  readonly article = this.singleProvider.selected;
  readonly articleOverride = input<Selectable | undefined>(undefined);
  readonly studio = this.singleProvider.activeStudio;
  readonly date = input<Date | undefined>();
  
  readonly selectedTime = signal<string | null>(null);

  constructor(){
    effect(()=>{
      const _ = this.date();
      this.selected.emit(null);
      this.selectedTime.set(null);
    })
  }

  readonly duration = computed(()=>{
    const articleOverride = this.articleOverride(); 
    const article = this.article();
    if(articleOverride && (isService(articleOverride) || isPackage(articleOverride))) {
      return articleOverride.duration;
    }
    if( (articleOverride && !(isService(articleOverride) || isPackage(articleOverride))) ||
      (!article || !(isService(article) || isPackage(article)))) return Infinity;
    return article.duration;
  })

  intervals = computed(()=>{
    const studio = this.studio();
    const date = this.date();
    const filter = this.user.filters();
    const duration = this.duration();

    if(!studio || !date) return [];
    const avails = studio.available
    const timeZone = studio.timeZone;

    
    let dateIntervals = avails.filter(avail => {
      return dateToYYYYMMDD(date) === avail.date
    })
    .flatMap(avail => {
      return avail.intervals
    })


    if(filter.timeslot){
      const tsStart = toMinutes(filter.timeslot.start);
      const tsEnd = toMinutes(filter.timeslot.end);

      dateIntervals = dateIntervals.filter( i => {
          const iStart = toMinutes(i.start);
          const iEnd = toMinutes(i.end);
          const start = Math.max(tsStart, iStart);
          const end = Math.min(tsEnd, iEnd);
          return end - start >= duration;
      })
    }


    return dateIntervals;
  })

  readonly slots = computed(()=>{
    const studio = this.studio();
    const intervals = this.intervals();
    const duration = this.duration();
    const date = this.date();
    const filter = this.user.filters();
    
    
    if(!date || !studio || !intervals || !intervals.length) return [];
    

    const timeZone = studio.timeZone;
    let options: string[] = [];
    

    for(let i of intervals){
      const iStart = toMinutes(i.start);
      const iEnd = toMinutes(i.end);
        
      for (let t = iStart; t + duration <= iEnd; t += duration) {
        options.push(minutesToTime(t));
      }
    }

    const now = getZonedNow(timeZone).dateTime;


    if(isSameDay(now, date)){
      const time = now.toTimeString().slice(0, 5);
      const minutes = toMinutes(time);
      const padding = 30;
      options = options.filter(o => toMinutes(o) >= minutes + padding);
      
    }

    if(filter.timeslot){
      const start = toMinutes(filter.timeslot.start);
      const end = toMinutes(filter.timeslot.end);


      options = options.filter( o => {
        const ot = toMinutes(o)
        return ot >= start && ot + duration <= end;
      })
      
    }

    return options;
  })


  onTimeClick(time: string) {
    this.selectedTime.set(time);
    this.selected.emit(time);
  }
  readonly isSelected = computed(()=>{
    const time = this.selectedTime();
    return (t: string) => t===time;
  })
}
