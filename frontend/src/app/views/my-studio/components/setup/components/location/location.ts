import { Component, computed, inject, output, Signal, signal } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { Button } from "../../../../../../components/common/button/button";
import { TextField } from "../../../../../../components/common/text-field/text-field";
import { NumberField } from "../../../../../../components/common/number-field/number-field";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { setup_errors, COUNTRIES } from '../../../../../../CONST';
import { Select } from "../../../../../../components/common/select/select";
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { UnifiedSetter } from '../../../../../../services/unified/unified-setter';
import { RequestState, Studio } from '../../../../../../models/models';
import { LocationProvider } from '../../../../../../services/location/location-provider';

@Component({
  selector: 'setup-location',
  imports: [Button, TextField, NumberField, ErrorMessage, Select, RequestStatusMessage],
  templateUrl: './location.html',
  styleUrl: './location.css',
})
export class Location {
  private readonly translate = inject(TranslationService);
  private readonly setup = inject(SetupService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setter = inject(UnifiedSetter);
  private readonly locationsProvider = inject(LocationProvider);

  readonly next = output<void>();
  readonly vm = this.setup.locationVm;
  
  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */

  readonly saveRequestState = signal<RequestState<Studio>>(this.setter.idleState<'studio'>());
  readonly requestStatus = computed(() => this.saveRequestState().status);

  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['location']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });
 
  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.LOCATION.TITLE')
  });

  readonly errorBody = computed<string[]>(() => {
    const errors = this.errors();
    const form = this.vm().form;

    return Object.keys(errors).reduce<string[]>((errorList, key) => {
      if (form.hasError(key)) {
        errorList.push(errors[key]);
      }
      return errorList;
    }, []);
  });

  readonly view = computed(()=> this.vm().value)

  readonly viewInvalid = computed(()=> this.vm().state === 'invalid');

  readonly getCountryNames = computed<string[]>(() => { 
    const countries = this.locationsProvider.locations().map(i => i.country);
    return Array.from(new Set(countries));
  });
  
  readonly getCityNames = computed<string[]>(() => {
    const country = this.view().country;
    return country
      ? this.locationsProvider.locations().filter(i => i.country === country).map(i => i.city)
      : this.locationsProvider.locations().map(i => i.city);
  });

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */

  setStudioCountry(value: string){ 
    if(value === this.view().country) return;
    this.setup.setCountry(value);
  }
  setStudioCity(value: string){
    if(value === this.view().city) return;
    this.setup.setCity(value);
  }
  setStudioStreet(value: string){ 
    if(value === this.view().street) return;
    this.setup.setStreet(value);
  }
  setStudioBuildingNumber(value: string){
    if(value === this.view().buildingNumber) return;
    this.setup.setBuildingNumber(value);
  }
  setStudioApartmentNumber(value: string){ 
    if(value === this.view().apartmentNumber) return;
    this.setup.setApartmentNumber(value);
  }
  setStudioLatitude(value: number | null) {
    const current = this.view().latitude;
    if(value === null && current === null) return;
    if(value !== null && value === current) return;
    this.setup.setLatitude(value ?? undefined);
  }
  setStudioLongitude(value: number | null){
    const current = this.view().longitude;
    if(value === null && current === null) return;
    if(value !== null && value === current) return;
    this.setup.setLongitude(value ?? undefined);
  }


  save(){
    if(!this.viewInvalid()) 
      this.setup.saveLocation()
      .subscribe({
        next: (value)=>{
          this.saveRequestState.set(value);
          if(value.status === 'success'){
            this.singleProvider.update(value.data);
            this.setup.markAsSaved('location');
          } 
        },
        error: (err)=>{ console.error(err); }
      });
  }

  /* ---------------------------------------------------
     VALIDATORS
  --------------------------------------------------- */
  studioCountryValidator = (value: string) : boolean => { return !!value; }
  studioCityValidator = (value: string) : boolean => { return !!value; }
  studioStreetValidator = (value: string[]): boolean => { return !!value; }
  studioBuildingNumberValidator = (value: string): boolean => { return !!value; }
  studioApartmentNumberValidator = (value: string): boolean => { return !!value; }
  studioLatitudeValidator = (value: number | null): boolean => { return !!value && value >= -90 && value <= 90; }
  studioLongitudeValidator = (value: number | null): boolean => { return !!value && value >= -180 && value <=180; }

  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);

  readonly title = computed(()=>{
    this.lang()
    return this.tr('SETUP.LOCATION.TITLE');
  })
  
  readonly par1 = computed(()=>{
    this.lang()
    return this.tr('SETUP.LOCATION.PAR1');
  })

  readonly saveLabel = computed(()=>{
    this.lang()
    return this.tr('BUTTON.SAVE');
  })

  readonly nextLabel = computed(()=>{
    this.lang()
    return this.tr('BUTTON.NEXT');
  })

  readonly countryLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.COUNTRY');
  })

  readonly countryPlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.COUNTRY');
  })

  readonly cityLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.CITY');
  })

  readonly cityPlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.CITY');
  })

  readonly streetLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.STREET');
  })

  readonly streetPlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.STREET');
  })

  readonly buildingNumberLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.BUILDING_NUMBER');
  })

  readonly buildingNumberPlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.BUILDING_NUMBER');
  })

  readonly apartmentNumberLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.APARTMENT_NUMBER');
  })

  readonly apartmentNumberPlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.APARTMENT_NUMBER');
  })

  readonly latitudeLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.LATITUDE');
  })

  readonly latitudePlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.LATITUDE');
  })

  readonly longitudeLabel = computed(()=>{
    this.lang()
    return this.tr('TEXTFIELD_TITLES.LONGITUDE');
  })

  readonly longitudePlaceholder = computed(()=>{
    this.lang()
    return this.tr('PLACEHOLDER.LONGITUDE');
  })
}
