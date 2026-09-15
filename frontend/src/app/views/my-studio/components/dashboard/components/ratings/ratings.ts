import { Component, computed, inject } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { toMinutes } from '../../../../../../util/studio_hours';
import { Reservation, ReservationRating } from '../../../../../../models/models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'dashboard-ratings',
  imports: [DecimalPipe],
  templateUrl: './ratings.html',
  styleUrl: './ratings.css',
})
export class Ratings {

  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);

  readonly reservations = this.singleProvider.activeOwnerReservations;

  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */

  readonly hasRatings = computed<boolean>(() => {
    const ratings = this.sortedRatings();
    return !!ratings.length;
  });

  readonly sortedReservations = computed<Reservation[]>(() => {
    const reservations = this.reservations();

    const sortedReservations = [...reservations].sort((a, b) => {
      const dateA = a.timeslot.date;
      const dateB = b.timeslot.date;

      if (dateA !== dateB) {
        return dateA > dateB ? -1 : 1;
      }

      return toMinutes(b.timeslot.start) - toMinutes(a.timeslot.start);
    });
    return sortedReservations;
  })

  readonly sortedRatings = computed<ReservationRating[]>(() => {
    const sortedReservations = this.sortedReservations()
    return sortedReservations.filter(i => !!i.rating).map(i => i.rating!)
  });

  readonly distribution = computed<number[]>(() => {
    const ratings = this.sortedRatings();
    const dist = [ratings.length, 0, 0, 0, 0, 0]; //  indices. 1-5 are used for ratings, 0 is total ratings
    ratings.forEach(r => dist[r.rating] += 1 )
    return dist;
  })

  readonly average = computed<number>(() => {
    const dist = this.distribution();
    return (dist[1] * 1 + dist[2] * 2 + dist[3] * 3 + dist[4] * 4 + dist[5] * 5) / dist[0];
  })

  readonly unratedDistribution = computed<number[]>(() => {
    const sortedReservations = this.sortedReservations();
    const withRating = sortedReservations.filter(i => !!i.rating).map(i => i.rating!)
    const dist = [sortedReservations.length, withRating.length, sortedReservations.length - withRating.length]; // 0 - total, 1 - with reviews, 2 - without reviews
    return dist;
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
    return this.tr('DASHBOARD.REVIEWS.TITLE');
  })
  
  readonly averageText = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.REVIEWS.AVERAGE_RATING');
  })

  readonly fiveStarText = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.REVIEWS.FIVE_STAR');
  })

  readonly oneTwoStarText = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.REVIEWS.ONE_TWO_STAR');
  })

  readonly unratedBookingsText = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.REVIEWS.UNRATED_BOOKINGS');
  })

  readonly reviewsText = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.REVIEWS.REVIEWS');
  })

  readonly noRatingsText = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.REVIEWS.NO_RATINGS');
  })
}
