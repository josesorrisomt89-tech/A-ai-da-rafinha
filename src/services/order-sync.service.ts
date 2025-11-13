import { Injectable } from '@angular/core';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config/firebase.config';
import { Order } from '../models/product.model';
import { Subject } from 'rxjs';

// Type placeholders for Firebase functions. This avoids needing the actual types at compile time.
type InitializeAppFn = (config: object) => any;
type GetDatabaseFn = (app: any) => any;
type RefFn = (db: any, path: string) => any;
type PushFn = (ref: any, value: any) => Promise<any>;
type QueryFn = (...args: any[]) => any;
type OrderByChildFn = (path: string) => any;
type StartAtFn = (value: any, key?: string) => any;
type OnChildAddedFn = (query: any, callback: (snapshot: any) => void) => any;
type DataSnapshot = any; // We can't get the real type, so we use any.


@Injectable({ providedIn: 'root' })
export class OrderSyncService {
  private db: any;
  private isListening = false;
  private firebaseReady: Promise<void>;
  private resolveFirebaseReady!: () => void;

  // Store imported functions to avoid re-importing
  private _initializeApp!: InitializeAppFn;
  private _getDatabase!: GetDatabaseFn;
  private _ref!: RefFn;
  private _push!: PushFn;
  private _query!: QueryFn;
  private _orderByChild!: OrderByChildFn;
  private _startAt!: StartAtFn;
  private _onChildAdded!: OnChildAddedFn;
  
  private newOrdersSubject = new Subject<Order>();
  public newOrders$ = this.newOrdersSubject.asObservable();

  constructor() {
    this.firebaseReady = new Promise(resolve => {
        this.resolveFirebaseReady = resolve;
    });
    this.initializeFirebase();
  }

  private async initializeFirebase(): Promise<void> {
    if (!isFirebaseConfigured()) {
      console.warn("Firebase não configurado. A sincronização de pedidos em tempo real está desativada.");
      return;
    }

    try {
      // Use dynamic imports that are resolved at runtime by the browser (using the importmap)
      const [appModule, dbModule] = await Promise.all([
        import('firebase/app'),
        import('firebase/database')
      ]);

      this._initializeApp = appModule.initializeApp;
      this._getDatabase = dbModule.getDatabase;
      this._ref = dbModule.ref;
      this._push = dbModule.push;
      this._query = dbModule.query;
      this._orderByChild = dbModule.orderByChild;
      this._startAt = dbModule.startAt;
      this._onChildAdded = dbModule.onChildAdded;

      const app = this._initializeApp(FIREBASE_CONFIG);
      this.db = this._getDatabase(app);
      this.resolveFirebaseReady(); // Signal that Firebase is ready
    } catch (e) {
      console.error("Não foi possível inicializar o Firebase. A sincronização de pedidos em tempo real estará desativada.", e);
      alert("A configuração do Firebase parece estar incorreta. Verifique o arquivo 'src/config/firebase.config.ts'.");
    }
  }

  async sendOrder(order: Order): Promise<void> {
    await this.firebaseReady;
    if (!this.db) {
      console.log("Firebase não disponível, o pedido não foi enviado em tempo real.");
      return;
    }
    const ordersRef = this._ref(this.db, 'online-orders');
    await this._push(ordersRef, order);
  }

  async startListeningForOrders(): Promise<void> {
    await this.firebaseReady;
    if (!this.db || this.isListening) return;
    
    this.isListening = true;
    console.log("Iniciando escuta por novos pedidos online...");
    
    const ordersRef = this._ref(this.db, 'online-orders');
    const recentOrdersQuery = this._query(ordersRef, this._orderByChild('timestamp'), this._startAt(Date.now()));
    
    this._onChildAdded(recentOrdersQuery, (snapshot: DataSnapshot) => {
      const newOrder = snapshot.val() as Order;
      if (newOrder) {
        console.log("Tempo real: novo pedido recebido do Firebase", newOrder);
        this.newOrdersSubject.next(newOrder);
      }
    });
  }
}
