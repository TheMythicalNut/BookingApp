
import { Component, ChangeDetectionStrategy, inject, input, output, ViewChild, ElementRef, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList, CdkDragHandle, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TranslationService } from '../../../services/translation/translation';

export type MultiImageAction =
    | { type: 'add'; files: File[] }
    | { type: 'remove'; index: number }
    | { type: 'reorder'; previousIndex: number; currentIndex: number }

@Component({
  selector: 'app-multi-image-upload',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDropList, CdkDragHandle],
  templateUrl: './multi-image-upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiImageUpload {

  private readonly translate = inject(TranslationService);

  /* ---------------------------------- Inputs --------------------------------- */

  readonly imageUrls = input<string[]>([]);
  readonly title = input<string>();
  readonly helper = input<string>();
  readonly required = input<boolean>(true);
  readonly label = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly aspect = input<string>('aspect-[2/3]');
  readonly maxFileCount = input<number>(3);

  /* ---------------------------------- Output --------------------------------- */

  readonly action = output<MultiImageAction>();

  @ViewChild('fileInput', { static: true })
  private readonly fileInputRef!: ElementRef<HTMLInputElement>;

  /* ---------------------------------- State ---------------------------------- */

  readonly errorMessage = signal<string | null>(null);
  readonly isDraggingFiles = signal(false);
  readonly isFocused = signal(false);

  readonly hasImages = computed(() => this.imageUrls().length > 0);

  readonly isAtMax = computed(
    () => this.imageUrls().length >= this.maxFileCount()
  );

  /* ---------------------------- Reset Errors on Input ------------------------- */

  constructor() {
    effect(() => {
      this.imageUrls();
      this.errorMessage.set(null);
    });
  }

  /* ------------------------------- Translations ------------------------------- */

  readonly removeText = computed(() => {
    this.translate.userLang();
    return this.translate.translate('SETUP.MEDIA.REMOVE');
  });

  readonly selectText = computed(() => {
    this.translate.userLang();
    return this.translate.translate('SETUP.MEDIA.SELECT');
  });

  /* ------------------------------ File Handling ------------------------------- */

  triggerFileSelect(): void {
    if (this.isAtMax()) {
      this.setLimitError();
      return;
    }
    this.fileInputRef.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.handleIncomingFiles(Array.from(input.files));
    input.value = '';
  }

  private handleIncomingFiles(newFiles: File[]): void {
    const remainingSlots = this.maxFileCount() - this.imageUrls().length;

    if (remainingSlots <= 0) {
      this.setLimitError();
      return;
    }

    const accepted: File[] = [];
    const rejected: File[] = [];

    for (const file of newFiles) {
      if (!this.isValidImage(file)) {
        rejected.push(file);
        continue;
      }

      if (accepted.length < remainingSlots) {
        accepted.push(file);
      }
    }

    if (rejected.length) {
      this.errorMessage.set(
        this.translate.translate('SETUP.MEDIA.INVALID_TYPE')
      );
    }

    if (!accepted.length) {
      if (!rejected.length) this.setLimitError();
      return;
    }

    this.action.emit({ type: 'add', files: accepted });
  }

  /* ------------------------------- Remove Image ------------------------------- */

  onRemove(index: number, event?: Event): void {
    event?.stopPropagation();
    this.action.emit({ type: 'remove', index });
  }

  /* ------------------------------- Drag Files -------------------------------- */

  private dragCounter = 0;

  onContainerDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    this.isDraggingFiles.set(true);
  }

  onContainerDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.isDraggingFiles.set(false);
    }
  }

  onContainerDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingFiles.set(false);
    this.dragCounter = 0;

    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleIncomingFiles(Array.from(files));
    }
  }

  /* ------------------------------ Reorder Images ------------------------------ */

  onImageReorder(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    this.action.emit({
      type: 'reorder',
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex
    });
  }

  /* ------------------------------- Utilities -------------------------------- */

  private isValidImage(file: File): boolean {
    return ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
  }

  private setLimitError(): void {
    this.errorMessage.set(
      this.translate.translate('SETUP.MEDIA.MAX_REACHED')
    );
  }
}