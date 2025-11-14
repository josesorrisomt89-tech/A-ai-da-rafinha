import { ChangeDetectionStrategy, Component, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Permission } from '../../models/product.model';

type View = 'menu' | 'pos' | 'admin' | 'kitchen';
type LoginStep = 'password' | 'destination';

@Component({
  selector: 'PosLoginModal',
  templateUrl: './pos-login-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class PosLoginModalComponent {
  dataService = inject(DataService);
  
  loginSuccess = output<void>();
  close = output<void>();
  navigateTo = output<View>();

  password = signal('');
  error = signal('');
  step = signal<LoginStep>('password');
  
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

  checkPassword() {
    if (this.dataService.login(this.password())) {
      this.loginSuccess.emit();
      this.step.set('destination');
      this.error.set('');
    } else {
      this.error.set('Senha incorreta. Tente novamente.');
      this.password.set('');
    }
  }
  
  selectDestination(view: View) {
    this.navigateTo.emit(view);
  }

  closeModal() {
    this.password.set('');
    this.error.set('');
    this.step.set('password');
    this.close.emit();
  }
  
  onInput() {
    if (this.error()) {
      this.error.set('');
    }
  }
}