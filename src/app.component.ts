// FIX: Inject DataService and add effect for dynamic theming.
import { Component, ChangeDetectionStrategy, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { LandingComponent } from './components/landing/landing.component';
import { MenuComponent } from './components/menu/menu.component';
import { PosComponent } from './components/pos/pos.component';
import { AdminComponent } from './components/admin/admin.component';
import { KitchenComponent } from './components/kitchen/kitchen.component';
import { ProductModalComponent } from './components/product-modal/product-modal.component';
import { CheckoutModalComponent } from './components/checkout-modal/checkout-modal.component';
import { PosLoginModalComponent } from './components/pos-login-modal/pos-login-modal.component';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking.component';
import { Product, Permission } from './models/product.model';
import { NotificationService } from './services/notification.service';
import { DataService } from './services/data.service';
import { OrderSyncService } from './services/order-sync.service';

type View = 'landing' | 'menu' | 'pos' | 'admin' | 'track' | 'kitchen';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HeaderComponent,
    LandingComponent,
    MenuComponent,
    PosComponent,
    AdminComponent,
    KitchenComponent,
    ProductModalComponent,
    CheckoutModalComponent,
    PosLoginModalComponent,
    OrderTrackingComponent,
  ],
})
export class AppComponent {
  private notificationService = inject(NotificationService);
  dataService = inject(DataService);
  private orderSyncService = inject(OrderSyncService); // Initializes the service
  
  currentView = signal<View>('landing');
  isAuthenticated = computed(() => !!this.dataService.currentUser());
  
  selectedProduct = signal<Product | null>(null);
  isProductModalOpen = signal(false);
  isCheckoutModalOpen = signal(false);
  isPosLoginModalOpen = signal(false);

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

  handleViewChange(view: View) {
    const user = this.dataService.currentUser();

    // If not authenticated, always show login modal for protected views
    if (!user && (view === 'pos' || view === 'admin' || view === 'kitchen')) {
      this.isPosLoginModalOpen.set(true);
      return;
    }

    let canAccess = false;
    const adminPermissions: Permission[] = ['access_orders', 'access_cash_register', 'access_finance', 'access_products', 'access_modifiers', 'access_categories', 'access_delivery', 'access_settings'];

    switch (view) {
      case 'landing':
      case 'menu':
      case 'track':
        canAccess = true;
        break;
      case 'pos':
        canAccess = user?.isAdmin || user?.permissions.includes('access_pos') || false;
        break;
      case 'kitchen':
        canAccess = user?.isAdmin || user?.permissions.includes('access_kitchen') || false;
        break;
      case 'admin':
        canAccess = user?.isAdmin || user?.permissions.some(p => adminPermissions.includes(p)) || false;
        break;
    }

    if (canAccess) {
       if (view === 'pos' || view === 'admin' || view === 'kitchen') {
        this.notificationService.clearVisualNotification();
      }
      this.currentView.set(view);
    } else {
      console.warn(`User cannot access view '${view}'. Defaulting to landing.`);
      this.currentView.set('landing');
    }
  }

  handleLoginSuccess() {
    // The modal will now ask where to navigate.
    // isAuthenticated is now a computed signal.
  }
  
  navigateTo(view: View) {
    if (view === 'pos' || view === 'admin' || view === 'kitchen') {
      this.notificationService.clearVisualNotification();
    }
    this.currentView.set(view);
    this.isPosLoginModalOpen.set(false);
  }

  enterMenu() {
    this.currentView.set('menu');
  }

  openProductModal(product: Product) {
    this.selectedProduct.set(product);
    this.isProductModalOpen.set(true);
  }

  closeProductModal() {
    this.isProductModalOpen.set(false);
    this.selectedProduct.set(null);
  }

  openCheckoutModal() {
    this.isCheckoutModalOpen.set(true);
  }
  
  closeCheckoutModal() {
    this.isCheckoutModalOpen.set(false);
  }
  
  closePosLoginModal() {
    this.isPosLoginModalOpen.set(false);
  }
}