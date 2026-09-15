import { Component, output, inject, input, effect } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslationService } from '../../../services/translation/translation';
import { TranslatePipe } from "../../../pipes/translate-pipe";
import { FormsModule } from '@angular/forms';
import { TimeDrum, TimeModel } from './components/time-drum/time-drum';
import { UserProvider } from '../../../services/user/user';
import { timerange } from '../../../models/models';
import { DAY } from '../../../util/time_constants';


interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
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
  selector: 'app-date-picker',
  imports: [FormsModule, TranslatePipe, TimeDrum, NgClass],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css'
})
export class DatePicker {
  private readonly user = inject(UserProvider);
  private readonly translate = inject(TranslationService);

  isOpen = input<boolean>(false);
  close = output<void>();

  view: 'date' | 'time' = 'date';

  calendars: MonthCalendar[] = [];
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  weekDays = this.translate.weekDays;
  monthNames = this.translate.monthNames;

  startModel: TimeModel = { h: '09', m: '00' };
  endModel:   TimeModel = { h: '18', m: '00' };

  timeRange = { start: '09:00', end: '18:00'}
  syncStart() { this.timeRange.start = `${this.startModel.h}:${this.startModel.m}`; }
  syncEnd()   { this.timeRange.end   = `${this.endModel.h}:${this.endModel.m}`; }

  constructor(){
    effect(()=>{
      const _ = this.translate.userLang();
      this.generateCalendars();
    })
    
    this.initNextWeekRange();
    this.updateRangeVisuals();
  }

  private initNextWeekRange(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDate = today.getDate();

    const weekFromNow = new Date(today);
    const twoWeeksFromNow = new Date(today);
    weekFromNow.setDate(todayDate + 7);
    twoWeeksFromNow.setDate(todayDate + 14);

    this.selectedStartDate = weekFromNow;
    this.selectedEndDate   = twoWeeksFromNow;
  }

  generateCalendars() {
    const today = new Date();
    this.calendars = [];

    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const calendar = this.generateMonthCalendar(monthDate);
      this.calendars.push(calendar);
    }
  }

  generateMonthCalendar(date: Date): MonthCalendar {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const monthName = this.monthNames()[month];

    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === month;
      const dayInfo = this.createDayInfo(currentDate, isCurrentMonth);
      days.push(dayInfo);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { month, year, monthName, days };
  }

  createDayInfo(date: Date, isCurrentMonth: boolean): CalendarDay {
    var create_date = new Date(date);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      date: new Date(date),
      isCurrentMonth,
      isSelected: false,
      isInRange: false,
      isRangeStart: false,
      isRangeEnd: false,
      isToday: (create_date.getTime() - today.getTime()) > 0 && Math.abs(create_date.getTime() - today.getTime()) < DAY,
      isDisabled: create_date.getTime() < today.getTime()
    };
  }

  onDayClick(day: CalendarDay) {
    if (!day.isCurrentMonth || day.isDisabled) return;

    const clickedDate = new Date(day.date);

    if (!this.selectedStartDate || this.selectedEndDate) {
      this.selectedStartDate = clickedDate;
      this.selectedEndDate   = null;
    } else {
      if (clickedDate < this.selectedStartDate) {
        this.selectedEndDate   = this.selectedStartDate;
        this.selectedStartDate = clickedDate;
      } else {
        this.selectedEndDate = clickedDate;
      }
    }
    this.updateRangeVisuals();
  }

  updateRangeVisuals() {
    this.calendars.forEach(cal => {
      cal.days.forEach(day => {
        day.isSelected = false;
        day.isInRange  = false;
        day.isRangeStart = false;
        day.isRangeEnd   = false;

        const dayTime = day.date.getTime();

        /* one-day range is just start === end */
        if (this.selectedStartDate) {
          const start = this.selectedStartDate.getTime();
          const end   = this.selectedEndDate?.getTime() ?? start;

          if (dayTime >= start && dayTime <= end) {
            day.isInRange = true;
            if (dayTime === start) day.isRangeStart = true;
            if (dayTime === end)   day.isRangeEnd   = true;
          }
        }
      });
    });
  }

  onContinue() {
    if(this.view === 'date' && this.selectedStartDate){
      if(!this.selectedStartDate) return;
      this.view = 'time';
    }
    else if(this.view === 'time'){
      if(this.timeRange.start >= this.timeRange.end) return;
      const start_date = this.selectedStartDate;
      const end_date = this.selectedEndDate? this.selectedEndDate : this.selectedStartDate;
      const start_time = this.timeRange.start;
      const end_time = this.timeRange.end;
      
      const timeslot: timerange = {
        startDate: start_date!, endDate: end_date!,
        start: start_time, end: end_time
      }

      this.user.setTimeslot(timeslot);

      this.close.emit();
      this.view = 'date';
    }

  }

  onBackdropClick() {
    this.close.emit();
  }

  isContinueDisabled(): boolean {
    return this.view === 'date'? 
    !this.selectedStartDate : 
    !(this.timeRange.start && this.timeRange.end) 
      || this.timeRange.start >= this.timeRange.end;
  }
}