import { Component, computed, inject, input } from '@angular/core';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { UpperCasePipe } from '@angular/common';
import { Package } from '../../../../models/models';

@Component({
  selector: 'studio-list-packages',
  imports: [UpperCasePipe],
  templateUrl: './list-packages.html',
  styleUrl: './list-packages.css',
})
export class ListPackages {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  readonly packages = this.singleProvider.activeStudioPackages;
  readonly services = this.singleProvider.activeStudioServices;

  packageWidth = input<number>()
  
  readonly getPackageTypeName = computed<string>(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PACKAGE_TYPE');
  })

  readonly getPackageCount = computed<number>(()=>{
    const packages = this.packages();
    return packages.length;
  })

  getPackageImageCount(pkg: Package):number{
    return Math.max(1, Math.min(pkg.services.length, 4));
  }

  readonly getPackageImages = computed<(pkg: Package) => string[]>(() => {
    const services = this.services();

    return (pkg: Package) => services.filter(it => pkg.services.includes(it.id)).map(it => it.thumbnail.url).slice(0, 4);
  });


  onPackage(id: string){
    this.singleProvider.select('package', id);
  }


}
