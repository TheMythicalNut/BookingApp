import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideTranslationInitializer } from './app/services/translation/translation';
import { TitleStrategy } from '@angular/router';
import { StudioTitleResolver } from './app/resolvers/studio-title-resolver-resolver';
import { provideLocationsInitializer } from './app/services/location/location-provider';
import { provideListProviderInitializer } from './app/services/unified/unified-list-provider';
import { provideHydrationProviderInitializer } from './app/services/hydration/hydration-provider';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    provideTranslationInitializer(),
    provideLocationsInitializer(),
    provideListProviderInitializer(),
    provideHydrationProviderInitializer(),
    {provide: TitleStrategy, useClass: StudioTitleResolver},
  ]
})
.catch((err) => console.error(err));
