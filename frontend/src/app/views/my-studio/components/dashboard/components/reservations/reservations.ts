import { Component, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { toMinutes } from '../../../../../../util/studio_hours';
import { Reservation } from '../../../../../../models/models';
import { Select } from "../../../../../../components/common/select/select";
import { DateSelect } from "../../../../../../components/common/date-select/date-select";
import { RESERVATION_STATUSES } from '../../../../../../CONST';
import { TextField } from "../../../../../../components/common/text-field/text-field";

@Component({
  selector: 'dashboard-reservations',
  imports: [Select, DateSelect, TextField],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class Reservations {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);

  readonly reservations = this.singleProvider.activeOwnerReservations;

  readonly filters = signal<{ article: string | undefined, status: string | undefined, date: string | undefined, search: string | undefined }>({article: undefined, status: undefined, date: undefined, search: undefined});

  readonly hasFilters = computed(() => {
    const f = this.filters()
    return !!f.article || !!f.date || !!f.status;
  })

  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */

  readonly hasReservations = computed<boolean>(() => {
    const reservations = this.reservations();
    return !!reservations.length;
  });

  readonly sortedReservations = computed<Reservation[]>(() => {
    const reservations = this.reservations();

    return [...reservations].sort((a, b) => {
      const dateA = a.timeslot.date;
      const dateB = b.timeslot.date;

      if (dateA !== dateB) {
        return dateA > dateB ? -1 : 1;
      }

      return toMinutes(b.timeslot.start) - toMinutes(a.timeslot.start);
    });
  });

  readonly filteredReservations = computed<Reservation[]>(() => {
    const reservations = this.sortedReservations();
    const filters = this.filters();

    const searchlc = filters.search?.toLowerCase() ?? null;
    return reservations.filter(i => 
      ((!!filters.article && i.articleName === filters.article) || !(!!filters.article)) &&
      ((!!filters.status && i.status.status === filters.status) || !(!!filters.status)) &&
      ((!!filters.date && i.timeslot.date === filters.date) || !(!!filters.date)) &&
      ((!!searchlc && 
        (i.timeslot.date.toLowerCase().includes(searchlc) || 
          i.timeslot.start.toLowerCase().includes(searchlc) ||
          i.additionalNote.toLowerCase().includes(searchlc) ||
          i.articleName.toLowerCase().includes(searchlc) ||
          i.categoryName.toLowerCase().includes(searchlc) || 
          i.discount.toString().toLowerCase().includes(searchlc) || 
          i.duration.toString().toLowerCase().includes(searchlc) || 
          i.price.toLowerCase().includes(searchlc) || 
          i.userEmail.toLowerCase().includes(searchlc) || 
          i.userPhone.toLowerCase().includes(searchlc) 
      ) ) || !(!!searchlc))
    );
  })

  readonly articleNames = computed<string[]>(()=>{
    const reservations = this.sortedReservations();
    return Array.from((new Set(reservations.map(i => i.articleName))));
  })


  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);
  trstatus = (key: string) => this.translate.getReservationStatusName(key);
  trtype = (key: string) => this.translate.getServiceTypeName([key]);
  
  readonly title = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.TITLE');

  })
  
  readonly clearFiltersText = computed(()=>{
    this.lang();
    return this.tr('BUTTON.CLEAR');
  })
  
  readonly searchPlaceholder = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.SEARCH_PLACEHOLDER');
  })

  readonly selectArticlePlaceholder = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.ARTICLE_PLACEHOLDER');
  })
  
  readonly selectStatusPlaceholder = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.STATUS_PLACEHOLDER');
  })

  readonly searchFilterTitle = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.SEARCH_FILTER');
  })
  
  readonly articleFilterTitle = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.ARTICLE_FILTER');
  })
  
  readonly statusFilterTitle = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.STATUS_FILTER');
  })
  
  readonly dateFilterTitle = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.DATE_FILTER');
  })

  readonly status = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.STATUS');
  })

  readonly bookingInfo = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.BOOKING_INFO');
  })
  
  readonly articleInfo = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.ARTICLE_INFO');
  })
  
  readonly rating = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.RATING');
  })

  readonly addons = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.ADDONS');
  })
  readonly noReservationsText = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.RESERVATIONS.NO_RESERVATIONS');
  })

  readonly statusMap = computed<Map<string, string>> (() => {
    this.lang();
    return new Map(
      Object.entries(RESERVATION_STATUSES)
      .map( e => { return [e[0], this.tr(e[1])]})
    )
  })

  readonly statusNames = computed<string[]> (() => {
    const map = this.statusMap();
    return Array.from(map.values());
  })

  readonly reverseStatusMap = computed<Map<string, string>> (() => {
    this.lang();
    return new Map(
      Object.entries(RESERVATION_STATUSES)
      .map( e => { return [this.tr(e[1]), e[0]]})
    )
  })
}
