import { Component, computed, inject } from '@angular/core';
import { TranslationService } from '../../../../services/translation/translation';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { formatCurrentWeek } from '../../../../util/studio_days';

@Component({
  selector: 'studio-working-days',
  imports: [],
  templateUrl: './working-days.html',
  styleUrl: './working-days.css',
})
export class WorkingDays {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  studio = this.singleProvider.activeStudio;

  getWorkingWeek = computed<string>(()=>{
    const studio = this.studio();
    const _ = this.translate.userLang();
    if(!studio) return '';
    return this.mapDateTokens(formatCurrentWeek(studio.timeZone, studio.weeklySchedules, studio.exceptions));
  })

  mapDateTokens(raw: string): string {
    const pieces = raw.split(/(\s+|:|,|-)/);

    const mapped = pieces.map((chunk) => this.translate.translate(chunk));

    return mapped.join('');
  }

}
