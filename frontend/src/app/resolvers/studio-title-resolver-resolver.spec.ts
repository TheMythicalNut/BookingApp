import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { studioTitleResolverResolver } from './studio-title-resolver-resolver';

describe('studioTitleResolverResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => studioTitleResolverResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
