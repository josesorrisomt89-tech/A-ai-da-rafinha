import { ChangeDetectionStrategy, Component, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'Landing',
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class LandingComponent {
  dataService = inject(DataService);
  enterMenu = output<void>();

  instagramUrl = computed(() => this.dataService.settings().instagramUrl);
  facebookUrl = computed(() => this.dataService.settings().facebookUrl);
  whatsappUrl = computed(() => {
    const number = this.dataService.settings().whatsappNumber;
    if (number && /^\d+$/.test(number)) {
      return `https://wa.me/${number}`;
    }
    return '#';
  });
}
