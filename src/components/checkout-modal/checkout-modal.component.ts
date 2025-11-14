import { ChangeDetectionStrategy, Component, computed, inject, output, signal, effect } from '@angular/core';
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

  // Scheduling state
  scheduledDate = signal<string>('');
  scheduledTime = signal<string>('');

  constructor() {
    effect(() => {
        if (!this.isStoreOpen() && this.availableScheduleDays().length > 0) {
            this.scheduledDate.set(this.availableScheduleDays()[0].value);
        }
    }, { allowSignalWrites: true });

    effect(() => {
        if (this.scheduledDate() && this.availableScheduleTimes().length > 0) {
            this.scheduledTime.set(this.availableScheduleTimes()[0]);
        }
    }, { allowSignalWrites: true });
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

  availableScheduleDays = computed(() => {
      const days = [];
      const dayMap: { [key: number]: string } = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };
      const today = new Date();

      for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayName = dayMap[date.getDay()];
          const schedule = this.dataService.settings().openingHours.find(h => h.day === dayName);

          if (schedule && schedule.isOpen) {
              const dateStr = date.toISOString().split('T')[0];
              const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit' });
              days.push({ value: dateStr, label: label });
          }
      }
      return days;
  });

  availableScheduleTimes = computed(() => {
    const selectedDateStr = this.scheduledDate();
    if (!selectedDateStr) return [];

    const date = new Date(`${selectedDateStr}T12:00:00.000Z`); // Use midday to avoid timezone issues
    const dayMap: { [key: number]: string } = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };
    const dayName = dayMap[date.getUTCDay()];
    const schedule = this.dataService.settings().openingHours.find(h => h.day === dayName);

    if (!schedule || !schedule.isOpen) return [];
    
    const times: string[] = [];
    let [startHour, startMinute] = schedule.open.split(':').map(Number);
    let [endHour, endMinute] = schedule.close.split(':').map(Number);

    // Handle overnight closing times
    if (endHour < startHour) {
      endHour += 24;
    }

    const now = new Date();
    const isToday = new Date().toISOString().split('T')[0] === selectedDateStr;

    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();
    
    // Start from the next full 30-minute interval if it's today
    if(isToday) {
        startHour = currentMinute > 30 ? currentHour + 1 : currentHour;
        startMinute = currentMinute > 30 ? 0 : 30;
    }

    let time = new Date();
    time.setHours(startHour, startMinute, 0, 0);

    let end_time = new Date();
    end_time.setHours(endHour, endMinute, 0, 0);

    while (time < end_time) {
        times.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        time.setMinutes(time.getMinutes() + 30);
    }
    return times;
  });
  
  selectedDeliveryZone = computed(() => {
    const id = this.selectedNeighborhoodId();
    if (!id) return null;
    return this.dataService.deliveryZones().find(z => z.id === id);
  });
  
  deliveryFee = computed(() => this.selectedDeliveryZone()?.fee ?? 0);

  isFormValid = computed(() => {
    const isBaseValid = this.customerName().trim().length > 2 && 
      this.customerPhone().trim().length > 8 &&
      this.customerStreetAddress().trim().length > 5 &&
      this.selectedNeighborhoodId() !== null;

    if (!this.isStoreOpen()) {
        return isBaseValid && !!this.scheduledDate() && !!this.scheduledTime();
    }
    return isBaseValid;
  });

  totalWithDelivery = computed(() => this.dataService.cartTotal() + this.deliveryFee());
  
  changeDue = computed(() => {
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

    let scheduledTimestamp: number | undefined = undefined;
    if (!this.isStoreOpen()) {
        const [hour, minute] = this.scheduledTime().split(':').map(Number);
        const deliveryDate = new Date(this.scheduledDate());
        deliveryDate.setHours(hour, minute);
        scheduledTimestamp = deliveryDate.getTime();
    }

    const order = this.dataService.placeOnlineOrder({
      customerName: this.customerName(),
      customerPhone: this.customerPhone(),
      customerAddress: this.customerStreetAddress(),
      paymentMethod: this.paymentMethod(),
      neighborhood: zone.neighborhood,
      deliveryFee: zone.fee,
      scheduledDeliveryTime: scheduledTimestamp,
    });

    this.finalOrder.set(order);
    this.checkoutStep.set('receipt');
  }

  whatsappLink = computed(() => {
    const order = this.finalOrder();
    if (!order) return '';

    const storeNumber = this.dataService.settings().whatsappNumber;
    
    let message = `Olá! Gostaria de fazer o seguinte pedido:\n\n`;

    if (order.scheduledDeliveryTime) {
      const scheduledDate = new Date(order.scheduledDeliveryTime);
      message += `*>>> PEDIDO AGENDADO <<<\n`;
      message += `*Data de Entrega:* ${scheduledDate.toLocaleDateString('pt-BR')}\n`;
      message += `*Horário de Entrega:* ${scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
    }

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