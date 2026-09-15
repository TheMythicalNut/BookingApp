import { Component, computed, effect, HostListener, inject, input, output } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { Spinner } from '../../../../components/common/spinner/spinner';
import { ModalStudio } from '../modal-studio/modal-studio';
import { ModalService } from '../modal-service/modal-service';
import { ModalPackage } from '../modal-package/modal-package';
import { isOwner, isPackage, isReservation, isService, isStudio } from '../../../../models/models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-modal-container',
  imports: [Spinner, ModalStudio, ModalService, ModalPackage],
  templateUrl: './modal-container.html',
  styleUrl: './modal-container.css',
})
export class ModalContainer {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly router = inject(Router);
  ignoreStudio = input<boolean>(false);
  opened = output<void>();
  closed = output<void>();

  loading = this.singleProvider.loading;
  selected = this.singleProvider.selected;

  
  readonly selectedType = computed<'studio' | 'service' | 'package' | 'none'>(() => {
    const selected = this.selected();
    if(!selected) return 'none';
    if(isStudio(selected)) return 'studio';
    if(isService(selected)) return 'service';
    if(isPackage(selected)) return 'package'; 
    return 'none';
  })

  readonly isOpen = computed<boolean>(() => {
    const selected = this.selected();
    const loading = this.loading();

    if(selected && (
      isOwner(selected) || 
      ( isStudio(selected) && this.ignoreStudio() ) ||
      isReservation(selected)
    )) return false;

    return !!selected || loading;
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();

      if (open) {
        this.opened.emit();
      } else {
        this.closed.emit();
      }
    });
  }

  onBackdropClick() {
    if(this.ignoreStudio()){
      const studio = this.singleProvider.activeStudio()
      if(studio) {
        this.singleProvider.select('studio', studio.id);
        this.router.navigate([studio.link]);
      }
    } else
      this.singleProvider.clear();
    this.closed.emit();
  }
}
