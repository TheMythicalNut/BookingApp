import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { UserProvider } from '../../../../services/user/user';
import { TranslationService } from '../../../../services/translation/translation';
import { Available, isPackage, isService, timerange } from '../../../../models/models';
import { DAY } from '../../../../util/time_constants';
import { Selectable, UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { getZonedNow, toMinutes } from '../../../../util/studio_hours';
import { dateToYYYYMMDD, isSameDay } from '../../../../util/studio_days';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isDisabled: boolean;
}

interface MonthCalendar {
  month: number;
  year: number;
  monthName: string;
  days: CalendarDay[];
}

@Component({
  selector: 'reserve-date-select',
  imports: [],
  templateUrl: './date-select.html',
  styleUrl: './date-select.css',
})
export class DateSelect {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly user = inject(UserProvider);

  readonly selected = output<Date>();

  readonly article = this.singleProvider.selected;
  readonly articleOverride = input<Selectable | undefined>(undefined);
  readonly studio = this.singleProvider.activeStudio;

  readonly timeZone = computed(()=>{
    const studio = this.studio();
    if(!studio) return 'Europe/Belgrade';
    return studio.timeZone;
  })

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

  readonly calendars = signal<MonthCalendar[]>([]);
  readonly calendarIndex = signal(0);

  readonly hasCalendar = computed(()=>{
    const calendars = this.calendars();
    return !!calendars?.length;
  })

  readonly hasNextIndex = computed(()=>{
    const index = this.calendarIndex();
    const calendars = this.calendars();
    return index !== (calendars.length - 1);
  })
  readonly hasPreviousIndex = computed(()=>{
    const index = this.calendarIndex();
    return index !== 0;
  })
  readonly selectedDate = signal<Date | null>(null);
  readonly weekDays = this.translate.weekDays;
  readonly monthNames = this.translate.monthNames;

  readonly displayCalendar = computed(()=>{
    const index = this.calendarIndex();
    const calendars = this.calendars();
    return calendars[index];
  })

  readonly monthName = computed(()=>{
    const calendar = this.displayCalendar();
    if(!calendar) return '';
    return calendar.monthName;
  })

  readonly year = computed(()=>{
    const calendar = this.displayCalendar();
    if(!calendar) return '';
    return calendar.year;
  })

  readonly days = computed(()=>{
    const calendar = this.displayCalendar();
    if(!calendar) return [];
    return calendar.days;
  })

  readonly timeslot = computed(()=>{
    const filters = this.user.filters();
    return filters.timeslot;
  })

  readonly singleDay = computed(()=>{
    const timeslot = this.timeslot();
    return !!timeslot && timeslot.startDate === timeslot.endDate;
  })

  constructor(){
    effect(()=>{
      const _ = this.translate.userLang();
      const filters = this.user.filters();
      const studio = this.studio();
      if(!!studio && !!studio.available && studio.available.length){
        const available = studio.available;
        this.generateCalendars(filters.timeslot, available);
      }
    })
    effect(()=>{
      const selected = this.selectedDate();
      this.updateRangeVisuals(selected);
    })
  }

  generateCalendars(timeslot: timerange | undefined, available: Available[]) {
    const today = this.normalizeDate(new Date());
    this.calendars.set([]);
    const calendars: MonthCalendar[] = [];

    if (!timeslot) {
      for (let i = 0; i < 3; i++) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        calendars.push(this.generateMonthCalendar(monthDate, available));
      }
    } else {
      if(timeslot.startDate === timeslot.endDate) return;
      const rangeStart = this.normalizeDate(timeslot.startDate);
      const rangeEnd = this.normalizeDate(timeslot.endDate);

      let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      const lastMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

      while (cursor <= lastMonth) {
        const calendar = this.generateMonthCalendar(cursor, available, timeslot);
        if(calendar.days.some(it => it.isCurrentMonth && !it.isDisabled))
        calendars.push( calendar );
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }

    this.calendars.set(calendars);
  }

  generateMonthCalendar(date: Date, available: Available[], timeslot?: timerange): MonthCalendar {
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = this.monthNames()[month];
    const timeZone = this.timeZone();
    const now = getZonedNow(timeZone).dateTime;
    const minutesNow = toMinutes(now.toTimeString().slice(0, 5));
    const duration = this.duration();
    const padding = 30;

    const monthStart = this.normalizeDate(new Date(year, month, 1));
    const monthEnd = this.normalizeDate(new Date(year, month + 1, 0));

    let iterationStart: Date;
    let iterationEnd: Date;
    let actualRangeStart: Date | null = null;

    if (!timeslot) {
      iterationStart = new Date(monthStart);
      iterationStart.setDate(iterationStart.getDate() - iterationStart.getDay());

      iterationEnd = new Date(iterationStart);
      iterationEnd.setDate(iterationEnd.getDate() + 41);
      
    } else {
      actualRangeStart = this.normalizeDate(timeslot.startDate);
      const rangeEnd = this.normalizeDate(timeslot.endDate);

      const weekAlignedRangeStart = new Date(actualRangeStart);
      weekAlignedRangeStart.setDate(
        weekAlignedRangeStart.getDate() - weekAlignedRangeStart.getDay()
      );

      const gridStart = new Date(monthStart);
      gridStart.setDate(gridStart.getDate() - gridStart.getDay());

      iterationStart =
        weekAlignedRangeStart > gridStart ? weekAlignedRangeStart : gridStart;

      const gridEnd = new Date(monthEnd);
      gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

      iterationEnd = rangeEnd < gridEnd ? rangeEnd : gridEnd;
    }


    const startDate = timeslot ? dateToYYYYMMDD(timeslot.startDate) : dateToYYYYMMDD(iterationStart);
    const endDate = timeslot ? dateToYYYYMMDD(timeslot.endDate) : dateToYYYYMMDD(iterationEnd);
    
    const days: CalendarDay[] = [];
    const cursor = new Date(iterationStart);
    
    while (cursor <= iterationEnd) {
      const cursorDate = dateToYYYYMMDD(cursor);
      let isCurrentMonth = cursor.getMonth() === month;

      if (actualRangeStart && cursor < actualRangeStart) {
        isCurrentMonth = false;
      }

      if(isCurrentMonth && available?.length){
        isCurrentMonth = false;
        for(const a of available){
          const aDate = a.date

          if(aDate >= startDate && aDate <= endDate && cursorDate === aDate){
            const tsStart = !!timeslot? toMinutes(timeslot.start): undefined;
            const tsEnd = !!timeslot? toMinutes(timeslot.end): undefined;
            for(const i of a.intervals){
              const iStart = toMinutes(i.start);
              const iEnd = toMinutes(i.end);
              const start = tsStart !== undefined ? Math.max(tsStart, iStart) : iStart;
              const end = tsEnd !== undefined ? Math.min(tsEnd, iEnd) : iEnd;
    
              if (isSameDay(now, cursor) && end - duration - padding <= minutesNow) {
                  continue;
              }
              if (end - start >= duration) {
                  isCurrentMonth = true;
                  break;
              }
            }
            if(isCurrentMonth) break;
          }
        }
      }

      days.push(this.createDayInfo(cursor, isCurrentMonth));
      cursor.setDate(cursor.getDate() + 1);
    }

    return { month, year, monthName, days };
  }


  private normalizeDate(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  createDayInfo(date: Date, isCurrentMonth: boolean): CalendarDay {
    const create_date = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      date: new Date(date),
      isCurrentMonth,
      isSelected: false,
      isToday:
        (create_date.getTime() - today.getTime()) > 0 &&
        Math.abs(create_date.getTime() - today.getTime()) < DAY,
      isDisabled: create_date.getTime() < today.getTime()
    };
  }

  onDayClick(day: CalendarDay) {
    if (!day.isCurrentMonth || day.isDisabled) return;
    
    const clickedDate = new Date(day.date);
    this.selectedDate.set(clickedDate);
    if(day.isCurrentMonth && !day.isDisabled) 
      this.selected.emit(clickedDate);
  }

  updateRangeVisuals(selectedDate: Date | null) {
    const calendars = this.calendars();
    const time = selectedDate?.getTime();
    calendars.forEach(cal => {
      cal.days.forEach(day => {
        day.isSelected = false;
        const dayTime = day.date.getTime();

        if(time && dayTime === time){ 
            day.isSelected = true;
        }
      });
    });
  }

  
  prevCalendar(){
    const index = this.calendarIndex();
    const prev = Math.max(0, index - 1); 
    this.calendarIndex.set(prev);
  }
  nextCalendar(){
    const index = this.calendarIndex();
    const max = this.calendars().length;
    const prev = Math.min(max, index + 1); 
    this.calendarIndex.set(prev);
  }
}
