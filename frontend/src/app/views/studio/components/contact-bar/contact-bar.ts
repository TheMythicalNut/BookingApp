import { Component, computed, inject } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';

@Component({
  selector: 'studio-contact-bar',
  imports: [],
  templateUrl: './contact-bar.html',
  styleUrl: './contact-bar.css',
})
export class ContactBar {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  studio = this.singleProvider.activeStudio;
  
  hasIgLink = computed<boolean>(()=>{
    const studio = this.studio();
    if(!studio) return false;
    return !!studio.instagramLink;
  })
  hasFbLink = computed<boolean>(()=>{
    const studio = this.studio();
    if(!studio) return false;
    return !!studio.facebookLink;
  })
  hasWaPhone = computed<boolean>(()=>{
    const studio = this.studio();
    if(!studio) return false;
    return !!studio.whatsAppPhone;
  })
  hasContactMail = computed<boolean>(()=>{
    const studio = this.studio();
    if(!studio) return false;
    return !!studio.contactEmail;
  })
  hasContactPhone = computed<boolean>(()=>{
    const studio = this.studio();
    if(!studio) return false;
    return !!studio.contactPhone;
  })

  goToIG(){
    const studio = this.studio(); 
    if(!studio) return;
    window.open(studio.instagramLink, '_blank'); 
  }

  goToFB(){ 
    const studio = this.studio(); 
    if(!studio) return;
    window.open(studio.facebookLink, '_blank'); }

  goToWA(){
    const studio = this.studio(); 
    if(!studio) return;
    const sanitized = studio.whatsAppPhone.replace(/[^\d]/g, '');
    let url = `https://wa.me/${sanitized}`;
    window.open(url, '_blank');
  }
  goToMail(){
    const studio = this.studio(); 
    if(!studio) return;
    window.location.href = `mailto:${studio.contactEmail}`;
  }
  goToCall(){
    const studio = this.studio(); 
    if(!studio) return;
    const sanitized = studio.contactPhone.replace(/[^\d]/g, '');
    window.location.href = `tel:${sanitized}`;
  }
}
