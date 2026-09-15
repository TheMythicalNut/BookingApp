import { Component, computed, ElementRef, inject, output, signal, ViewChild } from '@angular/core';
import { TranslationService } from '../../../../services/translation/translation';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { Router } from '@angular/router';
import { isReservation, ReservationRating } from '../../../../models/models';
import { FormsModule } from '@angular/forms';
import { PostReview } from "../post-review/post-review";
import { TextArea } from "../../../../components/common/text-area/text-area";

@Component({
  selector: 'reservation-status-completed',
  imports: [FormsModule, PostReview, TextArea],
  templateUrl: './status-completed.html',
  styleUrl: './status-completed.css',
})
export class StatusCompleted {
  @ViewChild('comment_msg') comment!: ElementRef<HTMLInputElement>;
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly router = inject(Router);

  readonly review = output<ReservationRating>();
  readonly commentMaxLength: number = 255;

  readonly reservation = this.singleProvider.selected;
  readonly studio = this.singleProvider.activeStudio;
  readonly showPostReview = signal(false);
  readonly messageFocused = signal(false);
  readonly ratingNum = signal(0);
  readonly messageValue = signal('');

  readonly messageValueLength = computed(()=>{
    const mv = this.messageValue();
    return mv.length;
  })
  readonly hasRating = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return false;
    return !!res.rating;
  })

  readonly getMessageGratitude = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('MESSAGES.RATING_GRATITUDE');
  })

  readonly getCommentTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('TEXTFIELD_TITLES.COMMENT');
  })

  readonly getButtonSendText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.SEND');
  })

  readonly studioName = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.name;
  })
  readonly getCountry = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.country;
  })

  readonly getCity = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.city;
  })

  readonly getAddress = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.street + ' ' + studio.buildingNumber + '/' + studio.apartmentNumber;
  })

  focusComment(){
    this.comment.nativeElement.focus();
  }

  OnReview(){
    this.showPostReview.set(true);
    const rating = this.ratingNum();
    const message = this.messageValue();

    const review : ReservationRating = {
      rating: rating,
      ...(message ? { comment: message } : {})
    };

    this.review.emit(review);
  }

  navigateMaps(): void {
    const searchQuery = `${this.studioName()} ${this.getAddress()}, ${this.getCity()}, ${this.getCountry()}`

    if (!searchQuery?.trim()) return;
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    window.open(url, '_blank');
  }
}
