import { HttpInterceptorFn } from '@angular/common/http';
import { UserProvider } from '../../services/user/user';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const user = inject(UserProvider);
  const token = user.authtoken();
  
  if(!token) return next(req);

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });

  return next(authReq);
};
