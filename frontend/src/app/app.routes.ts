import { Routes } from '@angular/router';
import { Terms } from './views/terms/terms';
import { Contact } from './views/contact/contact';
import { Home } from './views/home/home';
import { StudioView } from './views/studio/studio';
import { OnReserve } from './views/on-reserve/on-reserve';
import { ReservationOverview } from './views/reservation-overview/reservation-overview';
import { Login } from './views/login/login';
import { MyStudio } from './views/my-studio/my-studio';
import { Admin } from './views/admin/admin';
import { ConfirmRegistration } from './views/confirm-registration/confirm-registration';
import { Register } from './views/register/register';

export const routes: Routes = [
    {path: '', component: Home},
    {path: '8LtR6USINk54vpjKiC6NwiWiMMpj9VaGnhh6X0l8BpEnIMFU', component: Admin},
    {path: 'contact', component: Contact},
    {path: 'tos', component: Terms},
    // {path: 'mystudio/register/:token', component: ConfirmRegistration},
    // {path: 'mystudio/register', component: Register},
    {path: 'mystudio/login', component: Login},
    {path: 'mystudio', component: MyStudio},
    {path: 'reserve', component: OnReserve},
    {path: 'reservation/:id', component: ReservationOverview},
    {path: ':studio/:article', component: StudioView},
    {path: ':studio', component: StudioView},
    {path: '**', redirectTo: ''}
];