import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIcons } from '@ng-icons/core';
import {
  solarHomeBoldDuotone, solarHeartBoldDuotone,
  solarSunBoldDuotone, solarMoonBoldDuotone,
  solarDollarBoldDuotone, solarTargetBoldDuotone, solarUserBoldDuotone,
  solarSortBoldDuotone, solarAltArrowUpBoldDuotone, solarAltArrowDownBoldDuotone,
  solarDoubleAltArrowLeftBoldDuotone, solarAltArrowLeftBoldDuotone,
  solarAltArrowRightBoldDuotone, solarDoubleAltArrowRightBoldDuotone,
  solarCloseCircleBoldDuotone,
  solarRefreshBoldDuotone, solarRefreshCircleBoldDuotone,
  solarTrashBinMinimalisticBoldDuotone, solarUploadBoldDuotone,
  solarDownloadMinimalisticBoldDuotone, solarCheckCircleBoldDuotone,
  solarCloudUploadBoldDuotone, solarFullScreenBoldDuotone,
  solarChatRoundDotsBoldDuotone,
  solarPauseBoldDuotone, solarPlayBoldDuotone,
  solarDangerCircleBoldDuotone, solarInfoCircleBoldDuotone,
  solarArrowRightBoldDuotone,
  solarSettingsMinimalisticBoldDuotone,
  solarSliderVerticalMinimalisticBoldDuotone,
  solarInfinityBoldDuotone,
  solarUsersGroupRoundedBoldDuotone,
  solarChatRoundBoldDuotone,
  solarShareBoldDuotone,
  solarFlagBoldDuotone,
  solarUserRoundedBoldDuotone,
  solarCardBoldDuotone,
  solarHashtagBoldDuotone,
  solarCalendarBoldDuotone,
  solarTagBoldDuotone,
  solarListDownMinimalisticBoldDuotone,
} from '@ng-icons/solar-icons/bold-duotone';
import { credentialsInterceptor } from './core/interceptors/credentials-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { authGuard } from './core/guards/auth.guard';
import { Dashboard } from './features/dashboard/dashboard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([credentialsInterceptor, errorInterceptor])),
    provideIcons({
      solarHomeBoldDuotone, solarHeartBoldDuotone,
      solarSunBoldDuotone, solarMoonBoldDuotone,
      solarDollarBoldDuotone, solarTargetBoldDuotone, solarUserBoldDuotone,
      solarSortBoldDuotone, solarAltArrowUpBoldDuotone, solarAltArrowDownBoldDuotone,
      solarDoubleAltArrowLeftBoldDuotone, solarAltArrowLeftBoldDuotone,
      solarAltArrowRightBoldDuotone, solarDoubleAltArrowRightBoldDuotone,
      solarCloseCircleBoldDuotone,
      solarRefreshBoldDuotone, solarRefreshCircleBoldDuotone,
      solarTrashBinMinimalisticBoldDuotone, solarUploadBoldDuotone,
      solarDownloadMinimalisticBoldDuotone, solarCheckCircleBoldDuotone,
      solarCloudUploadBoldDuotone, solarFullScreenBoldDuotone,
      solarChatRoundDotsBoldDuotone,
      solarPauseBoldDuotone, solarPlayBoldDuotone,
      solarDangerCircleBoldDuotone, solarInfoCircleBoldDuotone,
      solarArrowRightBoldDuotone,
      solarSettingsMinimalisticBoldDuotone,
      solarSliderVerticalMinimalisticBoldDuotone,
      solarInfinityBoldDuotone,
      solarUsersGroupRoundedBoldDuotone,
      solarChatRoundBoldDuotone,
      solarShareBoldDuotone,
      solarFlagBoldDuotone,
      solarUserRoundedBoldDuotone,
      solarCardBoldDuotone,
      solarHashtagBoldDuotone,
      solarCalendarBoldDuotone,
      solarTagBoldDuotone,
      solarListDownMinimalisticBoldDuotone,
    }),
    provideRouter([
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./features/auth/signup/signup').then((m) => m.Signup),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
      },
      { path: '', component: Dashboard, canActivate: [authGuard] },
      {
        path: 'donations',
        loadComponent: () =>
          import('./features/donations/donations').then((m) => m.Donations),
        canActivate: [authGuard],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.Settings),
        canActivate: [authGuard],
      },
      {
        path: 'fundraisers',
        loadComponent: () =>
          import('./features/fundraisers/fundraisers').then((m) => m.Fundraisers),
        canActivate: [authGuard],
      },
      {
        path: 'donors',
        loadComponent: () =>
          import('./features/donors/donors').then((m) => m.Donors),
        canActivate: [authGuard],
      },
      {
        path: 'conversations',
        loadComponent: () =>
          import('./features/conversations/conversations').then((m) => m.Conversations),
        canActivate: [authGuard],
      },
    ]),
  ],
};
