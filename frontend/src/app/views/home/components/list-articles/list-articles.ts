import { Component, HostListener, Signal, computed, inject, input, signal, viewChild } from '@angular/core';
import { UnifiedListProvider } from '../../../../services/unified/unified-list-provider';
import { TranslationService } from '../../../../services/translation/translation';
import { Article, isPackage, isService, Package, Service } from '../../../../models/models';
import { UpperCasePipe } from '@angular/common';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { Spinner } from '../../../../components/common/spinner/spinner';
import { HydrationProvider } from '../../../../services/hydration/hydration-provider';

@Component({
  selector: 'app-list-articles',
  imports: [UpperCasePipe, Spinner],
  templateUrl: './list-articles.html',
  styleUrl: './list-articles.css',
})
export class ListArticles {
  private readonly listProivder = inject(UnifiedListProvider);
  private readonly singleSetter = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  
  readonly innerWidth = signal(window.innerWidth);
  readonly defaultWidth = 412;

  readonly active = input<boolean>();
  readonly loading = this.listProivder.loading;
  readonly articles = this.listProivder.filteredArticles;

  @HostListener('window:resize')
  onResize() {
    this.innerWidth.set(window.innerWidth);
  }

  selectArticle(article : Article){
    if(isPackage(article)){
      this.selectPackage(article.id);
      return;
    }
    if(isService(article)){
      this.selectService(article.id);
      return;
    }
  }

  private selectService(identifier: string){
    this.singleSetter.select('service', identifier, false);
  }

  private selectPackage(identifier: string){
    this.singleSetter.select('package', identifier, false);
  }

  readonly getTypeName = computed(()=>{
    const _ = this.translate.userLang();
    return (type: string[]) => this.translate.getServiceTypeName(type);
  });

  readonly getPackageTypeName = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('PACKAGE_TYPE');
  });

  isS(article: Article){
    return isService(article);
  }
  isP(article: Article){
    return isPackage(article)
  }

  getPackageImageCount(pkg: Package): number {
    return Math.max(1, Math.min(4, pkg.services.length));
  }

  readonly getPackageImages = computed<(pkg: Package) => string[]>(() => {
    const articles = this.articles();

    return (pkg: Package) => articles
      .filter(it => isService(it) && pkg.services.includes(it.id))
      .map(it => (it as Service).thumbnail.url).slice(0, 4);
  });
}
