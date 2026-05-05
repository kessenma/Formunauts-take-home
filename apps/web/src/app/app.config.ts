import { ApplicationConfig, inject, Injectable, isDevMode, provideBrowserGlobalErrorListeners, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import type { Translation } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
class I18nLoader implements TranslocoLoader {
  readonly #http = inject(HttpClient);
  getTranslation(lang: string) {
    return this.#http.get<Translation>(`/i18n/${lang}.json`);
  }
}
import { provideIcons } from '@ng-icons/core';
import {
  solarHomeBoldDuotone, solarHeartBoldDuotone,
  solarHamburgerMenuBoldDuotone,
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
  solarFilterBoldDuotone,
  solarListBoldDuotone,
  solarMagniferBoldDuotone,
  solarFaceScanCircleBoldDuotone,
  solarFloorLampBoldDuotone,
  solarMoneyBagBoldDuotone,
  solarPieChartBoldDuotone,
  solarCalendarSearchBoldDuotone,
} from '@ng-icons/solar-icons/bold-duotone';
import { credentialsInterceptor } from './core/interceptors/credentials-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { authGuard } from './core/guards/auth.guard';
import { Dashboard } from './features/dashboard/dashboard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([credentialsInterceptor, errorInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['en', 'de'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: I18nLoader,
    }),
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      const initial = (localStorage.getItem('lang') ?? 'en') as 'en' | 'de';
      transloco.setActiveLang(initial);
      return firstValueFrom(transloco.load(initial));
    }),
    provideIcons({
      solarHomeBoldDuotone, solarHeartBoldDuotone,
      solarHamburgerMenuBoldDuotone,
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
      solarFilterBoldDuotone,
      solarListBoldDuotone,
      solarMagniferBoldDuotone,
      solarFaceScanCircleBoldDuotone,
      solarFloorLampBoldDuotone,
      solarMoneyBagBoldDuotone,
      solarPieChartBoldDuotone,
      solarCalendarSearchBoldDuotone,
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
        path: 'query',
        loadComponent: () =>
          import('./features/query/query').then((m) => m.Query),
        canActivate: [authGuard],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.Settings),
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
