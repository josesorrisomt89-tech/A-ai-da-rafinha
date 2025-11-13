import { Injectable, inject, Injector } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push } from 'firebase/database';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config/firebase.config';
import { Order } from '../models/product.model';
import { DataService } from './data.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class OrderSyncService {
  private db: any;
  private notificationService = inject(NotificationService);
  private injector = inject(Injector);
  private _dataService: DataService | null = null;

  // Lazily get the DataService instance to break the circular dependency
  private get dataService(): DataService {
      if (!this._dataService) {
          this._dataService = this.injector.get(DataService);
      }
      return this._dataService;
  }

  constructor() {
    if (isFirebaseConfigured()) {
      try {
        const app = initializeApp(FIREBASE_CONFIG);
        this.db = getDatabase(app);
        this.listenForNewOrders();
      } catch (e) {
        console.error("Não foi possível inicializar o Firebase. A sincronização de pedidos em tempo real estará desativada.", e);
        alert("A configuração do Firebase parece estar incorreta. Verifique o arquivo 'src/config/firebase.config.ts'.");
      }
    } else {
      console.warn("Firebase não configurado. A sincronização de pedidos em tempo real está desativada.");
    }
  }

  async sendOrder(order: Order): Promise<void> {
    if (!this.db) {
      console.log("Firebase não disponível, o pedido não foi enviado em tempo real.");
      return;
    }
    const ordersRef = ref(this.db, 'online-orders');
    await push(ordersRef, order);
  }

  private listenForNewOrders(): void {
    if (!this.db) return;
    
    const ordersRef = ref(this.db, 'online-orders');
    
    onValue(ordersRef, (snapshot) => {
      const remoteOrdersData = snapshot.val();
      if (remoteOrdersData) {
        const remoteOrders: Order[] = Object.values(remoteOrdersData);
        
        const existingOnlineOrderIds = new Set(
          this.dataService.orders().filter(o => o.isOnlineOrder).map(o => o.id)
        );
        
        const newOrders = remoteOrders.filter(o => o.isOnlineOrder && !existingOnlineOrderIds.has(o.id));

        if (newOrders.length > 0) {
            console.log("Novos pedidos online recebidos:", newOrders);
            this.dataService.orders.update(current => [...newOrders, ...current]);
            
            // Aciona a notificação apenas se houver um usuário logado (ou seja, no painel da loja)
            if (this.dataService.currentUser()) {
                this.notificationService.notifyNewOrder();
            }
        }
      }
    });
  }
}
