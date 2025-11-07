import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Order, CartItem, CartTopping } from '../../models/product.model';

type CheckoutStep = 'form' | 'receipt';

@Component({
  selector: 'CheckoutModal',
  templateUrl: './checkout-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class CheckoutModalComponent {
  dataService = inject(DataService);
  close = output<void>();

  checkoutStep = signal<CheckoutStep>('form');
  
  customerName = signal('');
  customerPhone = signal('');
  customerStreetAddress = signal('');
  selectedNeighborhoodId = signal<string | null>(null);
  paymentMethod = signal('pix');
  cashForChange = signal<number | null>(null);

  finalOrder = signal<Order | null>(null);

  selectedDeliveryZone = computed(() => {
    const id = this.selectedNeighborhoodId();
    if (!id) return null;
    return this.dataService.deliveryZones().find(z => z.id === id);
  });
  
  deliveryFee = computed(() => this.selectedDeliveryZone()?.fee ?? 0);

  isFormValid = computed(() => 
    this.customerName().trim().length > 2 && 
    this.customerPhone().trim().length > 8 &&
    this.customerStreetAddress().trim().length > 5 &&
    this.selectedNeighborhoodId() !== null
  );

  totalWithDelivery = computed(() => this.dataService.cartTotal() + this.deliveryFee());
  
  changeDue = computed(() => {
    // Use the final order's total for calculation after the cart is cleared.
    // If the order hasn't been finalized yet, use the live total from the cart.
    const total = this.finalOrder()?.total ?? this.totalWithDelivery();
    const paid = this.cashForChange();
    if (paid === null || paid < total) {
      return 0;
    }
    return paid - total;
  });

  submitOrder() {
    if (!this.isFormValid()) return;
    
    const zone = this.selectedDeliveryZone();
    if (!zone) return;

    const order = this.dataService.placeOnlineOrder({
      customerName: this.customerName(),
      customerPhone: this.customerPhone(),
      customerAddress: this.customerStreetAddress(),
      paymentMethod: this.paymentMethod(),
      neighborhood: zone.neighborhood,
      deliveryFee: zone.fee
    });

    this.finalOrder.set(order);
    this.checkoutStep.set('receipt');
  }

  whatsappLink = computed(() => {
    const order = this.finalOrder();
    if (!order) return '';

    const storeNumber = this.dataService.settings().whatsappNumber;
    
    let message = `Olá! Gostaria de fazer o seguinte pedido:\n\n`;
    message += `*Cliente:* ${order.customerName}\n`;
    message += `*Endereço:* ${order.neighborhood}, ${order.customerAddress}\n\n`;
    message += `*Itens do Pedido:*\n`;
    
    order.items.forEach(item => {
        message += `---------------------\n`;
        message += `*${item.product.name} (${item.size.name})* - R$ ${this.itemBasePrice(item).toFixed(2)}\n`;
        
        const groupedToppings = this.groupToppingsByCategory(item.toppings);
        groupedToppings.forEach(group => {
            message += `  *_${group.categoryName}_*\n`;
            group.toppings.forEach(t => {
                message += `    - ${t.topping.name}: + R$ ${t.topping.price.toFixed(2)}\n`;
            });
        });

        if (item.notes) {
            message += `  _Obs: ${item.notes}_\n`;
        }
    });

    message += `\n---------------------\n`;
    message += `*Subtotal:* R$ ${(order.total - order.deliveryFee).toFixed(2)}\n`;
    message += `*Taxa de Entrega:* R$ ${order.deliveryFee.toFixed(2)}\n`;
    message += `*TOTAL:* R$ ${order.total.toFixed(2)}\n\n`;
    message += `*Forma de Pagamento:* ${this.paymentMethod() === 'cartao' ? 'Cartão na Entrega' : this.paymentMethod() === 'dinheiro' ? 'Dinheiro na Entrega' : 'Pix'}\n`;

    if (this.paymentMethod() === 'dinheiro' && this.cashForChange() && this.cashForChange()! > 0) {
        message += `*Levar troco para:* R$ ${this.cashForChange()!.toFixed(2)}\n`;
        if (this.changeDue() > 0) {
          message += `*Troco:* R$ ${this.changeDue().toFixed(2)}\n`;
        }
    }
    
    message += `\n*Código do Pedido:* ${order.id}\n`;

    return `https://api.whatsapp.com/send?phone=${storeNumber}&text=${encodeURIComponent(message)}`;
  });

  closeModal() {
    this.close.emit();
  }

  itemBasePrice(item: CartItem): number {
    const toppingsPrice = item.toppings.reduce((sum, t) => sum + t.topping.price * t.quantity, 0);
    return item.totalPrice - toppingsPrice;
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
