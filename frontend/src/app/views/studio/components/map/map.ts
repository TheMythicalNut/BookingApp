import { afterRenderEffect, Component, effect, inject } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import * as L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'studio-map',
  imports: [],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  studio = this.singleProvider.activeStudio;

  constructor(){
    afterRenderEffect(()=>{
      const studio = this.studio();
      if(studio)
        this.initMap(studio.latitude, studio.longitude, studio.name);
    })
  }

  map!: L.Map;
  private initMap(lat: number, lon: number, name: string): void {
    this.map = L.map('map', { zoomControl: true }).setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: '/assets/leaflet/pin.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    L.marker([lat, lon], { icon })
      .addTo(this.map)
      .bindPopup(name)
      .openPopup();

    setTimeout(() => this.map.invalidateSize(), 0);
  }

}
