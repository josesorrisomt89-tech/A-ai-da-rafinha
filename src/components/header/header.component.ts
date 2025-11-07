
import { ChangeDetectionStrategy, Component, output, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { Permission } from '../../models/product.model';

type View = 'menu' | 'pos' | 'admin' | 'kitchen' | 'landing';

@Component({
  selector: 'Header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'print:hidden'
  }
})
export class HeaderComponent {
  dataService = inject(DataService);
  notificationService = inject(NotificationService);

  viewChange = output<View>();
  currentView = input.required<string>();

  canAccessPos = computed(() => {
    const user = this.dataService.currentUser();
    if (!user) return false;
    return user.isAdmin || user.permissions.includes('access_pos');
  });

  canAccessKitchen = computed(() => {
    const user = this.dataService.currentUser();
    if (!user) return false;
    return user.isAdmin || user.permissions.includes('access_kitchen');
  });

  canAccessAdmin = computed(() => {
    const user = this.dataService.currentUser();
    if (!user) return false;
    if (user.isAdmin) return true;
    const adminPermissions: Permission[] = ['access_orders', 'access_cash_register', 'access_finance', 'access_products', 'access_modifiers', 'access_categories', 'access_delivery', 'access_settings'];
    return user.permissions.some(p => adminPermissions.includes(p));
  });

  navItems = computed(() => {
    const user = this.dataService.currentUser();
    if (!user) return [];

    const items = [{ id: 'menu', label: 'Cardápio Digital' }];
    if (this.canAccessPos()) items.push({ id: 'pos', label: 'PDV Local' });
    if (this.canAccessKitchen()) items.push({ id: 'kitchen', label: 'Cozinha' });
    if (this.canAccessAdmin()) items.push({ id: 'admin', label: 'Admin' });

    return items;
  });

  changeView(view: View) {
    this.viewChange.emit(view);
  }

  logout() {
    this.dataService.logout();
    this.viewChange.emit('landing');
  }
}
