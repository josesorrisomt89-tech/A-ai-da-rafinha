import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Product, Order, CartItem, CartTopping } from '../../models/product.model';

type PosView = 'building' | 'details' | 'payment' | 'receipt';

@Component({
  selector: 'Pos',
  templateUrl: './pos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class PosComponent {
  dataService = inject(DataService);
  productSelect = output<Product>();

  view = signal<PosView>('building');

  // Order Type & Delivery Details
  isDelivery = signal(false);
  customerName = signal('');
  customerPhone = signal('');
  customerAddress = signal('');
  selectedNeighborhoodId = signal<string | null>(null);
  isFreeDelivery = signal(false);
  
  // Fiado Details
  customerCpf = signal('');
  paymentDueDate = signal('');

  selectedDeliveryZone = computed(() => {
    const id = this.selectedNeighborhoodId();
    if (!id) return null;
    return this.dataService.deliveryZones().find(z => z.id === id);
  });

  deliveryFee = computed(() => {
    if (!this.isDelivery()) return 0;
    if (this.isFreeDelivery()) return 0;
    return this.selectedDeliveryZone()?.fee ?? 0;
  });
  
  fiadoSurcharge = computed(() => {
      if (this.selectedPaymentMethod() === 'fiado') {
        const surchargeRate = this.dataService.settings().fiadoSurchargePercentage ?? 0;
        const subtotal = this.dataService.cartTotal() + this.deliveryFee();
        return subtotal * (surchargeRate / 100);
      }
      return 0;
  });

  orderTotal = computed(() => this.dataService.cartTotal() + this.deliveryFee() + this.fiadoSurcharge());

  isDeliveryFormValid = computed(() => {
    if (!this.isDelivery()) return true; // Not delivery, so it's valid for proceeding
    return this.customerName().trim().length > 2 &&
           this.customerPhone().trim().length > 8 &&
           this.customerAddress().trim().length > 5 &&
           this.selectedNeighborhoodId() !== null;
  });
  
  isFiadoFormValid = computed(() => {
    if (this.selectedPaymentMethod() !== 'fiado') {
      return true;
    }
    // For delivery, name/phone/address are already validated.
    const isBaseCustomerDataValid = this.isDelivery() ? true : 
        this.customerName().trim().length > 2 &&
        this.customerPhone().trim().length > 8 &&
        this.customerAddress().trim().length > 5;
        
    return isBaseCustomerDataValid &&
           this.customerCpf().trim().length > 10 &&
           this.paymentDueDate() !== '';
  });

  isPaymentReady = computed(() => {
    if (!this.selectedPaymentMethod()) return false;
    if (this.selectedPaymentMethod() === 'fiado') {
      return this.isFiadoFormValid();
    }
    return true;
  });


  // Payment
  selectedPaymentMethod = signal<string | null>(null);
  cashPaid = signal<number>(0);
  change = computed(() => {
    const total = this.orderTotal();
    const paid = this.cashPaid() || 0;
    return paid > total ? paid - total : 0;
  });

  // Receipt
  finishedOrder = signal<Order | null>(null);

  productsByCategory(categoryId: string): Product[] {
    return this.dataService.products().filter(p => p.categoryId === categoryId);
  }

  selectProduct(product: Product) {
    this.productSelect.emit(product);
  }
  
  getToppingNames(toppings: CartTopping[]): string {
    if (!toppings || toppings.length === 0) {
      return '';
    }
    return toppings.map(t => t.quantity > 1 ? `${t.topping.name} (x${t.quantity})` : t.topping.name).join(', ');
  }

  goToDetails() {
    if (this.dataService.cart().length > 0) {
      this.view.set('details');
    }
  }

  goToPayment() {
    this.view.set('payment');
  }

  selectPaymentMethod(method: string) {
    this.selectedPaymentMethod.set(method);
  }

  finishOrder() {
    if (this.dataService.cart().length === 0 || !this.isPaymentReady()) return;

    const newOrder: Order = {
      id: `POS-${Date.now().toString().slice(-6)}`,
      timestamp: Date.now(),
      items: this.dataService.cart(),
      total: this.orderTotal(),
      customerName: this.isDelivery() || this.selectedPaymentMethod() === 'fiado' ? this.customerName() : 'Cliente Balcão',
      customerPhone: this.isDelivery() || this.selectedPaymentMethod() === 'fiado' ? this.customerPhone() : '',
      customerAddress: this.isDelivery() || this.selectedPaymentMethod() === 'fiado' ? this.customerAddress() : '',
      neighborhood: this.isDelivery() ? this.selectedDeliveryZone()?.neighborhood ?? '' : '',
      deliveryFee: this.deliveryFee(),
      paymentMethod: this.selectedPaymentMethod()!,
      status: 'delivered',
      isOnlineOrder: false,
      paymentStatus: this.selectedPaymentMethod() === 'fiado' ? 'unpaid' : 'paid',
      // Fiado specific fields
      customerCpf: this.selectedPaymentMethod() === 'fiado' ? this.customerCpf() : undefined,
      paymentDueDate: this.selectedPaymentMethod() === 'fiado' ? this.paymentDueDate() : undefined,
      surcharge: this.selectedPaymentMethod() === 'fiado' ? this.fiadoSurcharge() : undefined,
    };
    
    this.dataService.orders.update(current => [newOrder, ...current]);
    this.finishedOrder.set(newOrder);
    this.view.set('receipt');
  }
  
  startNewOrder() {
    this.dataService.clearCart();
    this.finishedOrder.set(null);
    this.selectedPaymentMethod.set(null);
    this.cashPaid.set(0);
    
    this.isDelivery.set(false);
    this.customerName.set('');
    this.customerPhone.set('');
    this.customerAddress.set('');
    this.selectedNeighborhoodId.set(null);
    this.isFreeDelivery.set(false);
    
    this.customerCpf.set('');
    this.paymentDueDate.set('');
    
    this.view.set('building');
  }

  printReceipt() {
    window.print();
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