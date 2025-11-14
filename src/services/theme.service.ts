import { Injectable, inject, effect } from '@angular/core';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private dataService = inject(DataService);

  constructor() {
    effect(() => {
      const settings = this.dataService.settings();
      const root = document.documentElement;
      if (settings) {
        root.style.setProperty('--color-primary', settings.primaryColor);
        root.style.setProperty('--color-primary-hover', settings.primaryColorHover);
        root.style.setProperty('--color-primary-light-tint', settings.primaryColorLightTint);
        root.style.setProperty('--color-accent', settings.accentColor);
        root.style.setProperty('--color-text-on-primary', settings.textColorOnPrimary);
        root.style.setProperty('--bg-page', settings.backgroundColorPage);
        root.style.setProperty('--bg-card', settings.backgroundColorCard);
        root.style.setProperty('--text-primary', settings.textColorPrimary);
        root.style.setProperty('--text-secondary', settings.textColorSecondary);
        root.style.setProperty('--border-color', settings.borderColor);
      }
    });
  }
}
