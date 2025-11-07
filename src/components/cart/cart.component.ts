import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { CartTopping } from '../../models/product.model';

@Component({
  selector: 'Cart',
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class CartComponent {
  dataService = inject(DataService);
  checkout = output<void>();
  closeCart = output<void>();

  onCheckout() {
    this.checkout.emit();
  }

  getToppingNames(toppings: CartTopping[]): string {
    if (!toppings || toppings.length === 0) {
      return '';
    }
    return toppings.map(t => t.quantity > 1 ? `${t.topping.name} (x${t.quantity})` : t.topping.name).join(', ');
  }
}
