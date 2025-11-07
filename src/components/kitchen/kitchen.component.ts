import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Order, CartItem, CartTopping } from '../../models/product.model';

@Component({
  selector: 'Kitchen',
  templateUrl: './kitchen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class KitchenComponent {
  dataService = inject(DataService);

  acceptedOrders = computed(() => 
    this.dataService.orders()
      .filter(o => o.status === 'accepted')
      .sort((a, b) => a.timestamp - b.timestamp)
  );

  preparingOrders = computed(() => 
    this.dataService.orders()
      .filter(o => o.status === 'preparing')
      .sort((a, b) => a.timestamp - b.timestamp)
  );

  startPreparation(order: Order) {
    this.dataService.updateOrderStatus(order.id, 'preparing');
  }

  finishPreparation(order: Order) {
    this.dataService.updateOrderStatus(order.id, 'awaiting_delivery');
  }

  groupToppingsByCategory(toppings: CartTopping[]): { categoryName: string; toppings: CartTopping[] }[] {
    if (!toppings || toppings.length === 0) {
      return [];
    }
    const modifierCategories = this.dataService.modifierCategories();
    const grouped: Record<string, { categoryName: string; toppings: CartTopping[] }> = {};

    for (const cartTopping of toppings) {
      const categoryId = cartTopping.topping.modifierCategoryId;
      if (categoryId) {
        if (!grouped[categoryId]) {
          const category = modifierCategories.find(c => c.id === categoryId);
          grouped[categoryId] = {
            categoryName: category ? category.name : 'Adicionais',
            toppings: []
          };
        }
        grouped[categoryId].toppings.push(cartTopping);
      }
    }
    return Object.values(grouped);
  }
}
