import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { RequestState } from '../../models/models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UnifiedSingleProvider } from '../unified/unified-single-provider';
import { UserProvider } from '../user/user';
import { AdminQueryResult } from '../../views/admin/admin';


export type LoginData = {
  token: string,
  owner: string, // OWNER FOREIGN KEY
} 

@Injectable({
  providedIn: 'root',
})
export class UtilityProvider {
  private readonly http = inject(HttpClient);
  private readonly user = inject(UserProvider);
  private readonly singleProvider = inject(UnifiedSingleProvider);

  sendQuestion(email: string, message: string): Observable<RequestState<Boolean>> {
    return this.http.post<RequestState<Boolean>>(`/api/question/send`, {email, message});
  }

  login(email: string, password: string): Observable<RequestState<LoginData>> {
    return this.http.post<RequestState<LoginData>>(`/api/login`, {email, password})
    .pipe(
      tap((request) =>{
        if(request.status === 'success'){
          this.user.setToken(request.data.token);
          this.singleProvider.select('owner', request.data.owner);
        }
      })
    );
  }

  adminLogin(password: string): Observable<RequestState<string>> { // returns token
    return this.http.post<RequestState<string>>(`/api/admin/login`, {password})
    .pipe(
      tap((request) => {
        if(request.status === 'success'){
          this.user.setToken(request.data);
        }
      })
    )
  }

  adminRequest(request: string): Observable<RequestState<AdminQueryResult>> {
    return this.http.post<RequestState<AdminQueryResult>>(`/api/admin/request`, {request});
  }

  register(email: string, password: string): Observable<RequestState<Boolean>> {
    return this.http.post<RequestState<Boolean>>(`/api/register`, {email, password});
  }
}
