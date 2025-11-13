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
type OnChildAddedFn = (query: any, callback: (snapshot: any) => void) => () => void;
type DataSnapshot = any; // We can't get the real type, so we use any.


@Injectable({ providedIn: 'root' })
export class OrderSyncService {
  private db: any;
  private isListening = false;
  private firebaseReady: Promise<void>;
  private resolveFirebaseReady!: () => void;
  private rejectFirebaseReady!: (reason?: any) => void;
  private unsubscribeFromOrders: (() => void) | null = null;

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
    this.firebaseReady = new Promise((resolve, reject) => {
        this.resolveFirebaseReady = resolve;
        this.rejectFirebaseReady = reject;
    });
    this.initializeFirebase();
  }

  private async initializeFirebase(): Promise<void> {
    if (!isFirebaseConfigured()) {
      console.warn("Firebase not configured. Real-time order sync is disabled.");
      // Resolve the promise to allow the app to function without real-time features.
      // The service will operate in a disabled state gracefully.
      this.resolveFirebaseReady();
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
      console.error("Failed to initialize Firebase. Real-time order sync will be disabled.", e);
      // Even with a config, initialization can fail. We resolve to prevent crashes.
      this.resolveFirebaseReady();
    }
  }

  async sendOrder(order: Order): Promise<void> {
    try {
      await this.firebaseReady;
      if (!this.db) {
        // This is now the expected path when Firebase is not configured.
        return;
      }
      const ordersRef = this._ref(this.db, 'online-orders');
      await this._push(ordersRef, order);
    } catch(err) {
      console.error("Error sending order to Firebase:", err);
    }
  }

  async startListeningForOrders(): Promise<void> {
    await this.firebaseReady;
    if (!this.db || this.isListening) {
      return;
    }
    
    this.isListening = true;
    console.log("Starting to listen for new online orders...");
    
    const ordersRef = this._ref(this.db, 'online-orders');
    const recentOrdersQuery = this._query(ordersRef, this._orderByChild('timestamp'), this._startAt(Date.now()));
    
    this.unsubscribeFromOrders = this._onChildAdded(recentOrdersQuery, (snapshot: DataSnapshot) => {
      const newOrder = snapshot.val() as Order;
      if (newOrder) {
        console.log("Real-time: new order received from Firebase", newOrder);
        this.newOrdersSubject.next(newOrder);
      }
    });
  }
  
  stopListeningForOrders(): void {
    if (this.unsubscribeFromOrders) {
      this.unsubscribeFromOrders();
      this.unsubscribeFromOrders = null;
      this.isListening = false;
      console.log("Stopped listening for new online orders.");
    }
  }
}