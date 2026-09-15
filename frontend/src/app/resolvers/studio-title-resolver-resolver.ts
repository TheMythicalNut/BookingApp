import { Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class StudioTitleResolver extends TitleStrategy {
  override updateTitle(snapshot: RouterStateSnapshot) {
    const route = snapshot.root.firstChild;
    if(!route){
      document.title = 'SPLETKA';
      return;
    }

    const path = route.routeConfig?.path;

    switch(path){
      case '':
        document.title = 'SPLETKA';
        break;
      case 'contact':
        document.title = 'SPLETKA - contact';
        break;
      case 'tos':
        document.title = 'SPLETKA - terms of service';
        break;
      case 'reserve':
        document.title = 'SPLETKA - reserve'
        break;
      case 'reservation/:id':
        document.title = 'SPLETKA - reservation overview'
        break;
      case 'mystudio':
        document.title = 'SPLETKA - my studio';
        break;
      case 'mystudio/confirm/:token':
        document.title = 'SPLETKA - confirm register'
        break;
      case ':studio':
      case ':studio/:service': {
        const studio = route.params['studio'];
        const service = route.params['service'];

        document.title = service
          ? `SPLETKA - ${studio} - ${service}`
          : `SPLETKA - ${studio}`;
        break;
      }

      default:
        document.title = 'SPLETKA';
    }
  }
}