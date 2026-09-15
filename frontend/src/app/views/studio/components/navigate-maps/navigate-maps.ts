import { Component, computed, inject } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';

@Component({
  selector: 'studio-navigate-maps',
  imports: [],
  templateUrl: './navigate-maps.html',
  styleUrl: './navigate-maps.css',
})
export class NavigateMaps {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  studio = this.singleProvider.activeStudio;

  readonly getName = computed<string>(()=>{
    const studio = this.studio();
    if(!studio) return '';
    return studio.country;
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

  navigateMaps(): void {
    const searchQuery = `${this.getName()} ${this.getAddress()}, ${this.getCity()}, ${this.getCountry()}`

    if (!searchQuery?.trim()) return;
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    window.open(url, '_blank');
  }
}
