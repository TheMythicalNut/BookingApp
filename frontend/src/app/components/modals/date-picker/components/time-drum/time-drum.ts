import { Component, ElementRef, forwardRef, OnInit, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface TimeModel { h: string; m: string; }

@Component({
  selector: 'time-drum',
  templateUrl: './time-drum.html',
  styleUrls: ['./time-drum.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TimeDrum),
    multi: true
  }]
})
export class TimeDrum implements ControlValueAccessor, OnInit {
  @ViewChild('hCol', { static: false }) hColEl!: ElementRef<HTMLDivElement>;
  @ViewChild('mCol', { static: false }) mColEl!: ElementRef<HTMLDivElement>;

  hours  = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  minutes= Array.from({length: 12}, (_, i) => (i * 5).toString().padStart(2, '0'));

  h = '10';
  m = '15';

  private onT = (_: any) => {};
  private onC = () => {};

  ngOnInit() {
    setTimeout(() => this.scrollToSelected());
  }

  // ---- ControlValueAccessor ----
  writeValue(v: TimeModel | null) {
    if (v) { this.h = v.h; this.m = v.m; }
    setTimeout(() => this.scrollToSelected());
  }
  registerOnChange(fn: any) { this.onT = fn; }
  registerOnTouched(fn: any) { this.onC = fn; }

  // scroll handlers
  onScroll(col: 'h' | 'm', el: HTMLElement) {
    const idx = Math.round(el.scrollTop / 40);
    const arr = col === 'h' ? this.hours : this.minutes;
    const val = arr[Math.min(idx, arr.length - 1)];
    if (col === 'h') this.h = val; else this.m = val;
    this.notify();
  }

  private notify() {
    this.onT({ h: this.h, m: this.m });
    this.onC();
  }

  private scrollToSelected() {
    setTimeout(() => {
      const hh = this.hours.indexOf(this.h);
      const mm = this.minutes.indexOf(this.m);
      if (this.hColEl) this.hColEl.nativeElement.scrollTop = hh * 40;
      if (this.mColEl) this.mColEl.nativeElement.scrollTop = mm * 40;
    });
  }

  id = Math.random().toString(36).slice(2);
}