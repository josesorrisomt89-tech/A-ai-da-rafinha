import { ChangeDetectionStrategy, Component, inject, output, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Product, Modifier } from '../../models/product.model';
import { CartComponent } from '../cart/cart.component';
import { FormsModule } from '@angular/forms';

type View = 'menu' | 'pos' | 'admin' | 'track';

@Component({
  selector: 'Menu',
  templateUrl: './menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CartComponent, FormsModule],
})
export class MenuComponent implements OnInit, OnDestroy {
  dataService = inject(DataService);

  productSelect = output<Product>();
  showCheckout = output<void>();
  viewChange = output<View>();

  isCartVisible = signal(false);
  selectedCategoryId = signal<string | null>(null);
  
  private timer: any;
  currentBannerIndex = signal(0);

  constructor() {
    effect(() => {
      // Set initial category when categories are loaded
      if (!this.selectedCategoryId() && this.dataService.categories().length > 0) {
        this.selectedCategoryId.set(this.dataService.categories()[0].id);
      }
    });
  }
  
  ngOnInit() {
    this.startBannerSlideshow();
  }
  
  ngOnDestroy() {
    this.stopBannerSlideshow();
  }

  isStoreOpen = computed(() => {
    const settings = this.dataService.settings();
    if (settings.isTemporarilyClosed) {
      return false;
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const dayMap: { [key: number]: string } = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };
    const todayName = dayMap[dayOfWeek];
    
    const todayHours = settings.openingHours.find(h => h.day === todayName);

    if (!todayHours || !todayHours.isOpen) {
      return false;
    }

    return currentTime >= todayHours.open && currentTime < todayHours.close;
  });

  filteredProducts = computed(() => {
    const categoryId = this.selectedCategoryId();
    if (!categoryId) {
      return [];
    }
    return this.dataService.products().filter(p => p.categoryId === categoryId);
  });

  selectedCategoryName = computed(() => {
    const categoryId = this.selectedCategoryId();
    if (!categoryId) return '';
    return this.dataService.categories().find(c => c.id === categoryId)?.name;
  });

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  onProductClick(product: Product) {
    this.productSelect.emit(product);
  }

  onCheckoutClick() {
    this.showCheckout.emit();
    this.isCartVisible.set(false); // Close cart when proceeding to checkout
  }

  changeView(view: View) {
    this.viewChange.emit(view);
  }

  private startBannerSlideshow() {
    const banners = this.dataService.settings().promoBanners;
    if (banners && banners.length > 1) {
      this.timer = setInterval(() => {
        this.currentBannerIndex.update(i => (i + 1) % banners.length);
      }, 3000);
    }
  }

  private stopBannerSlideshow() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  getStartingPrice(product: Product): number {
    let sizes: Modifier[] = [];

    if (product.productSpecificSizes && product.productSpecificSizes.length > 0) {
      sizes = product.productSpecificSizes;
    } else if (product.categoryId === 'acai') { 
      sizes = this.dataService.sizes();
    }

    if (sizes.length > 0) {
      return Math.min(...sizes.map(s => s.price));
    }

    return product.basePrice;
  }
}