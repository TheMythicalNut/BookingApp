import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal, ViewChild } from '@angular/core';
import { TranslationService } from '../../../services/translation/translation';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-single-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './single-image-upload.html',
  styleUrl: './single-image-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SingleImageUpload {
  private readonly translate = inject(TranslationService);

  readonly title = input<string>();
  readonly helper = input<string>();
  readonly required = input<boolean>(true);
  readonly label = input<string>();
  readonly placeholder = input<string>();
  readonly imageUrl = input<string | null | undefined>(null);

  // Signal-based Output
  readonly fileSelected = output<File>();

  @ViewChild('fileInput', { static: true })
  private readonly fileInputRef!: ElementRef<HTMLInputElement>;

  // State signals
  readonly previewUrl = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isDragging = signal(false);
  readonly isFocused = signal(false);

  private objectUrl: string | null = null;

  readonly displayUrl = computed<string | null>(() => {
    return this.previewUrl() ?? this.imageUrl() ?? null;
  });

  readonly getImageChangeText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.MEDIA.CHANGE');
  })

  readonly getImageSelectText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.MEDIA.SELECT');
  })

  triggerFileSelect(): void {
    this.fileInputRef.nativeElement.click();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.triggerFileSelect();
    }
  }

  onFocus(): void {
    this.isFocused.set(true);
  }

  onBlur(): void {
    this.isFocused.set(false);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.handleFile(file);

    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
      return;
    }

    const file = event.dataTransfer.files[0];
    this.handleFile(file);
  }

  private handleFile(file: File): void {
    if (!this.isValidImage(file)) {
      this.errorMessage.set('Only PNG and JPG images are allowed.');
      return;
    }

    this.errorMessage.set(null);

    this.revokeObjectUrl();

    this.objectUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.objectUrl);

    this.fileSelected.emit(file);
  }

  private isValidImage(file: File): boolean {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    return allowedTypes.includes(file.type);
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
