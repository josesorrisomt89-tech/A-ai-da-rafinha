import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, query, orderByChild, startAt, onChildAdded, DataSnapshot } from 'firebase/database';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config/firebase.config';
import { Order } from '../models/product.model';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrderSyncService {
  private db: any;
  private isListening = false;
  
  private newOrdersSubject = new Subject<Order>();
  public newOrders$ = this.newOrdersSubject.asObservable();

  constructor() {
    if (isFirebaseConfigured()) {
      try {
        const app = initializeApp(FIREBASE_CONFIG);
        this.db = getDatabase(app);
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

  startListeningForOrders(): void {
    if (!this.db || this.isListening) return;
    
    this.isListening = true;
    console.log("Iniciando escuta por novos pedidos online...");
    
    const ordersRef = ref(this.db, 'online-orders');
    // Consulta para obter apenas novos pedidos a partir de agora.
    const recentOrdersQuery = query(ordersRef, orderByChild('timestamp'), startAt(Date.now()));
    
    onChildAdded(recentOrdersQuery, (snapshot: DataSnapshot) => {
      const newOrder = snapshot.val() as Order;
      if (newOrder) {
        console.log("Tempo real: novo pedido recebido do Firebase", newOrder);
        this.newOrdersSubject.next(newOrder);
      }
    });
  }
}