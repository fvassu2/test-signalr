import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'tablet',
        pathMatch: 'full'
    },
    {
        path: 'tablet',
        loadComponent: () => import('./pages/tablet/tablet.component').then(m => m.TabletComponent),
        title: 'Tablet Client'
    },
    {
        path: 'manager',
        loadComponent: () => import('./pages/manager/manager.component').then(m => m.ManagerComponent),
        title: 'Manager Dashboard'
    },
    {
        path: '**',
        redirectTo: 'tablet'
    }
];
