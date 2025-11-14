import { ChangeDetectionStrategy, Component, computed, inject, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Order, OrderStatus } from '../../models/product.model';

type View = 'menu' | 'pos' | 'admin' | 'track';

@Component({
  selector: 'OrderTracking',
  templateUrl: './order-tracking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class OrderTrackingComponent implements OnInit {
  dataService = inject(DataService);
  viewChange = output<View>();
  reordered = output<void>();
  
  orderIdInput = signal('');
  searchedId = signal('');
  orderHistory = signal<Order[]>([]);

  ngOnInit() {
    this.orderHistory.set(this.dataService.getOrderHistory());
  }
  
  foundOrder = computed(() => {
    const id = this.searchedId();
    if (!id) return null;
    return this.dataService.orders().find(o => o.id === id) ?? 'not_found';
  });
  
  readonly statusSteps: { key: OrderStatus, text: string }[] = [
    { key: 'accepted', text: 'Pedido Confirmado' },
    { key: 'preparing', text: 'Em Preparo' },
    { key: 'awaiting_delivery', text: 'Aguardando Entregador' },
    { key: 'out_for_delivery', text: 'Saiu para Entrega' },
    { key: 'delivered', text: 'Entregue' },
  ];

  searchOrder() {
    this.searchedId.set(this.orderIdInput());
  }
  
  getStatusIndex(status: OrderStatus): number {
    return this.statusSteps.findIndex(step => step.key === status);
  }
  
  getWhatsappShareLink(order: Order): string {
    const statusText = this.statusSteps.find(s => s.key === order.status)?.text ?? 'Consultar';
    const message = `Acompanhe meu pedido #${order.id.substring(0, 6)} na ${this.dataService.settings().storeName}! O status atual é: *${statusText}*.`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }
  
  changeView(view: View) {
    this.viewChange.emit(view);
  }

  reorder(order: Order) {
    this.dataService.reorderFromHistory(order);
    this.reordered.emit();
  }
}