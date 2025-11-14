import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Product, Category, Modifier, ModifierCategory, CartItem, Order, AppSettings, DeliveryZone, Expense, AccountPayable, User, CashRegisterSession, OrderStatus, PaymentStatus } from '../models/product.model';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notification.service';
import { MENU_DATA } from '../data/menu-data';

const STORAGE_PREFIX = 'acai_app_v7_'; // Versioned prefix to invalidate old cache

const EMPTY_SETTINGS: AppSettings = {
    storeName: "Carregando...",
    document: "", address: "", phone: "", whatsappNumber: "", instagramUrl: "", facebookUrl: "", logoUrl: "", bannerUrl: "",
    promoBanners: [], minDeliveryTime: 0, maxDeliveryTime: 0, minOrderValue: 0, freeDeliveryThreshold: 0,
    greetingMessage: "", isTemporarilyClosed: false, temporaryClosureMessage: "", openingHours: [], fiadoSurchargePercentage: 0,
    primaryColor: '#6a0dad', primaryColorHover: '#530a8a', primaryColorLightTint: '#6a0dad1a',
    accentColor: '#ff69b4', textColorOnPrimary: '#ffffff', backgroundColorPage: '#f3e5f5',
    backgroundColorCard: '#ffffff', textColorPrimary: '#333333', textColorSecondary: '#666666', borderColor: '#e0e0e0',
};
const ORDER_HISTORY_KEY = 'order_history'; // Key without prefix
const MAX_HISTORY_ITEMS = 10;

@Injectable({ providedIn: 'root' })
export class DataService {
  private notificationService = inject(NotificationService);

  // Core Data Signals
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  sizes = signal<Modifier[]>([]); // Global sizes for açaí
  toppings = signal<Modifier[]>([]);
  modifierCategories = signal<ModifierCategory[]>([]);
  settings = signal<AppSettings>(EMPTY_SETTINGS);
  deliveryZones = signal<DeliveryZone[]>([]);
  users = signal<User[]>([]);
  
  // Local/Transactional data that remains in localStorage
  orders = signal<Order[]>([]);
  expenses = signal<Expense[]>([]);
  accountsPayable = signal<AccountPayable[]>([]);
  cashRegisterHistory = signal<CashRegisterSession[]>([]);
  
  // State Signals
  cart = signal<CartItem[]>([]);
  currentUser = signal<User | null>(null);

  constructor() {
    this.loadInitialData();
    // Persist ALL data to localStorage. This makes the admin panel stateful
    // for the admin user. Customers will get updated data via the versioning system.
    effect(() => {
      this.saveToLocalStorage('products', this.products());
      this.saveToLocalStorage('categories', this.categories());
      this.saveToLocalStorage('sizes', this.sizes());
      this.saveToLocalStorage('toppings', this.toppings());
      this.saveToLocalStorage('modifierCategories', this.modifierCategories());
      this.saveToLocalStorage('settings', this.settings());
      this.saveToLocalStorage('deliveryZones', this.deliveryZones());
      this.saveToLocalStorage('users', this.users());
      
      this.saveToLocalStorage('orders', this.orders());
      this.saveToLocalStorage('expenses', this.expenses());
      this.saveToLocalStorage('accountsPayable', this.accountsPayable());
      this.saveToLocalStorage('cashRegisterHistory', this.cashRegisterHistory());
    });
  }

  // Computed Signals
  cartTotal = computed(() => this.cart().reduce((sum, item) => sum + item.totalPrice, 0));
  activeCashRegister = computed(() => this.cashRegisterHistory().find(r => r.status === 'open'));

  // --- LOCAL STORAGE ---
  private saveToLocalStorage(key: string, data: any) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }

  private loadFromLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return defaultValue;
    }
  }

  private loadInitialData(): void {
    try {
        const fileData: any = MENU_DATA;
        const remoteVersion = fileData.version || 0;
        const localVersion = this.loadFromLocalStorage('version', -1);
        const localSettings = this.loadFromLocalStorage('settings', null);

        // If remote is newer, or if there are no local settings (first visit for anyone), load from file.
        if (remoteVersion > localVersion || !localSettings) {
          console.log(`New data version detected (${remoteVersion}). Updating from source file.`);
          this.products.set(fileData.products);
          this.categories.set(fileData.categories);
          this.sizes.set(fileData.sizes);
          this.toppings.set(fileData.toppings);
          this.modifierCategories.set(fileData.modifierCategories);
          this.settings.set(fileData.settings);
          this.deliveryZones.set(fileData.deliveryZones);
          this.users.set(fileData.users);
          this.saveToLocalStorage('version', remoteVersion); // Update local version tracker
        } else {
          console.log('Local data is current. Loading from localStorage.');
          // Local version is up-to-date or newer (e.g., admin has unsaved changes), so load from localStorage.
          this.products.set(this.loadFromLocalStorage('products', fileData.products));
          this.categories.set(this.loadFromLocalStorage('categories', fileData.categories));
          this.sizes.set(this.loadFromLocalStorage('sizes', fileData.sizes));
          this.toppings.set(this.loadFromLocalStorage('toppings', fileData.toppings));
          this.modifierCategories.set(this.loadFromLocalStorage('modifierCategories', fileData.modifierCategories));
          this.settings.set(localSettings!); // Already loaded
          this.deliveryZones.set(this.loadFromLocalStorage('deliveryZones', fileData.deliveryZones));
          this.users.set(this.loadFromLocalStorage('users', fileData.users));
        }

        // Transactional data is always loaded from localStorage, regardless of version.
        this.orders.set(this.loadFromLocalStorage('orders', []));
        this.expenses.set(this.loadFromLocalStorage('expenses', []));
        this.accountsPayable.set(this.loadFromLocalStorage('accountsPayable', []));
        this.cashRegisterHistory.set(this.loadFromLocalStorage('cashRegisterHistory', []));
      } catch (err) {
        console.error("Fatal: Could not process 'menu-data.ts'. Attempting to load from localStorage as a fallback.", err);
        // Fallback logic remains, just in case the data file gets corrupted.
        this.products.set(this.loadFromLocalStorage('products', []));
        this.categories.set(this.loadFromLocalStorage('categories', []));
        this.sizes.set(this.loadFromLocalStorage('sizes', []));
        this.toppings.set(this.loadFromLocalStorage('toppings', []));
        this.modifierCategories.set(this.loadFromLocalStorage('modifierCategories', []));
        this.settings.set(this.loadFromLocalStorage('settings', EMPTY_SETTINGS));
        this.deliveryZones.set(this.loadFromLocalStorage('deliveryZones', []));
        this.users.set(this.loadFromLocalStorage('users', []));
        this.orders.set(this.loadFromLocalStorage('orders', []));
        this.expenses.set(this.loadFromLocalStorage('expenses', []));
        this.accountsPayable.set(this.loadFromLocalStorage('accountsPayable', []));
        this.cashRegisterHistory.set(this.loadFromLocalStorage('cashRegisterHistory', []));
      }
  }

  // --- CART ---
  addToCart(item: Omit<CartItem, 'id'>) {
    const newItem: CartItem = { ...item, id: uuidv4() };
    this.cart.update(currentCart => [...currentCart, newItem]);
  }

  removeFromCart(itemId: string) {
    this.cart.update(currentCart => currentCart.filter(item => item.id !== itemId));
  }
  
  clearCart() {
    this.cart.set([]);
  }

  // --- ORDERS ---
  placeOnlineOrder(details: { customerName: string; customerPhone: string; customerAddress: string; paymentMethod: string; neighborhood: string; deliveryFee: number; scheduledDeliveryTime?: number; referencePoint?: string; }): Order {
    const newOrder: Order = {
      id: `WEB-${Date.now().toString()}`,
      timestamp: Date.now(),
      items: this.cart(),
      total: this.cartTotal() + details.deliveryFee,
      customerName: details.customerName,
      customerPhone: details.customerPhone,
      customerAddress: details.customerAddress,
      neighborhood: details.neighborhood,
      deliveryFee: details.deliveryFee,
      paymentMethod: details.paymentMethod,
      status: 'pending',
      isOnlineOrder: true,
      paymentStatus: 'pending',
      scheduledDeliveryTime: details.scheduledDeliveryTime,
      referencePoint: details.referencePoint
    };
    
    // Add locally for customer's receipt page and for admin to see.
    this.orders.update(current => [newOrder, ...current]);
    
    // Notify admin if logged in
    if (this.currentUser()) {
      this.notificationService.notifyNewOrder();
    }

    this.clearCart();
    return newOrder;
  }
  
  updateOrderStatus(orderId: string, status: OrderStatus) {
    this.orders.update(orders => orders.map(o => o.id === orderId ? { ...o, status } : o));
  }
  
  updateOrderPaymentStatus(orderId: string, status: PaymentStatus) {
    this.orders.update(orders => orders.map(o => o.id === orderId ? { ...o, paymentStatus: status } : o));
  }

  // --- ORDER HISTORY ---
  getOrderHistory(): Order[] {
    return this.loadFromLocalStorage(ORDER_HISTORY_KEY, []);
  }

  saveOrderToHistory(order: Order) {
    try {
      const history = this.getOrderHistory();
      const newHistory = [order, ...history].slice(0, MAX_HISTORY_ITEMS);
      this.saveToLocalStorage(ORDER_HISTORY_KEY, newHistory);
    } catch (e) {
      console.error("Failed to save order to history:", e);
    }
  }

  reorderFromHistory(order: Order) {
    const newCartItems: CartItem[] = order.items.map(item => ({
      ...item,
      id: uuidv4() // Generate new unique IDs for the new cart items
    }));
    this.cart.set(newCartItems);
  }

  // --- AUTH ---
  login(password: string): boolean {
    const user = this.users().find(u => u.password === password);
    if (user) {
      this.currentUser.set(user);
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser.set(null);
  }

  // --- ADMIN - CRUD ---
  private saveItem<T extends { id: string }>(signalUpdater: (fn: (value: T[]) => T[]) => void, items: T[], item: Partial<T>): void {
    const existingIndex = item.id ? items.findIndex(i => i.id === item.id) : -1;
    if (existingIndex > -1 && item.id && !item.id.startsWith('new_')) {
      signalUpdater(current => current.map(i => i.id === item.id ? { ...i, ...item } as T : i));
    } else {
      const newItem = { ...item, id: uuidv4() } as T;
      signalUpdater(current => [...current, newItem]);
    }
  }
  private deleteItem<T extends { id: string }>(signalUpdater: (fn: (value: T[]) => T[]) => void, id: string): void {
    signalUpdater(current => current.filter(item => item.id !== id));
  }

  saveProduct(product: Product) { this.saveItem(this.products.update.bind(this.products), this.products(), product); }
  deleteProduct(id: string) { this.deleteItem(this.products.update.bind(this.products), id); }

  saveCategory(category: Category) { this.saveItem(this.categories.update.bind(this.categories), this.categories(), category); }
  deleteCategory(id: string) { this.deleteItem(this.categories.update.bind(this.categories), id); }
  
  saveModifier(modifier: Modifier) { 
    if (modifier.modifierCategoryId) { // it's a topping
        this.saveItem(this.toppings.update.bind(this.toppings), this.toppings(), modifier);
    } else { // it's a global size
        this.saveItem(this.sizes.update.bind(this.sizes), this.sizes(), modifier);
    }
  }
  deleteModifier(id: string) {
    this.toppings.update(t => t.filter(item => item.id !== id));
    this.sizes.update(s => s.filter(item => item.id !== id));
  }

  saveModifierCategory(category: ModifierCategory) { this.saveItem(this.modifierCategories.update.bind(this.modifierCategories), this.modifierCategories(), category); }
  deleteModifierCategory(id: string) { this.deleteItem(this.modifierCategories.update.bind(this.modifierCategories), id); }
  
  reorderModifierCategories(categories: ModifierCategory[]) {
    this.modifierCategories.set(categories);
  }

  saveExpense(expense: Expense) { this.saveItem(this.expenses.update.bind(this.expenses), this.expenses(), expense); }
  deleteExpense(id: string) { this.deleteItem(this.expenses.update.bind(this.expenses), id); }

  saveAccountPayable(payable: AccountPayable) { this.saveItem(this.accountsPayable.update.bind(this.accountsPayable), this.accountsPayable(), payable); }
  deleteAccountPayable(id: string) { this.deleteItem(this.accountsPayable.update.bind(this.accountsPayable), id); }
  
  saveDeliveryZone(zone: DeliveryZone) { this.saveItem(this.deliveryZones.update.bind(this.deliveryZones), this.deliveryZones(), zone); }
  deleteDeliveryZone(id: string) { this.deleteItem(this.deliveryZones.update.bind(this.deliveryZones), id); }

  saveUser(user: User) { this.saveItem(this.users.update.bind(this.users), this.users(), user); }
  deleteUser(id: string) { this.deleteItem(this.users.update.bind(this.users), id); }
  
  updateSettings(newSettings: AppSettings) {
    this.settings.set(newSettings);
  }

  toggleAccountPaidStatus(id: string, type: 'payable' | 'receivable') {
    if (type === 'payable') {
        this.accountsPayable.update(items => items.map(i => i.id === id ? {...i, isPaid: !i.isPaid} : i));
    }
  }

  // --- CASH REGISTER ---
  openCashRegister(startingBalance: number) {
    if (this.activeCashRegister()) {
      console.error("A cash register is already open.");
      return;
    }
    const newSession: CashRegisterSession = {
      id: uuidv4(),
      openingTime: Date.now(),
      closingTime: null,
      startingBalance: startingBalance,
      closingBalance: null,
      status: 'open'
    };
    this.cashRegisterHistory.update(history => [...history, newSession]);
  }
  
  closeCashRegister() {
    const activeRegister = this.activeCashRegister();
    if (!activeRegister) {
      console.error("No cash register is open to be closed.");
      return;
    }
    
    // In a real app, you'd calculate the closing balance here from sales.
    // For this app, it might be handled in the component.
    this.cashRegisterHistory.update(history => history.map(r => 
      r.id === activeRegister.id ? { ...r, status: 'closed', closingTime: Date.now() } : r
    ));
  }

  // --- DATA IMPORT/EXPORT ---
  exportDataForUpdate(): { content: string, filename: string } {
    const dataToExport = {
      version: Date.now(), // Add a new timestamp for this export
      settings: this.settings(),
      categories: this.categories(),
      sizes: this.sizes(),
      modifierCategories: this.modifierCategories(),
      toppings: this.toppings(),
      products: this.products(),
      users: this.users(),
      deliveryZones: this.deliveryZones(),
      orders: [], // Intentionally not exporting transactional data like orders
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const tsContent = `export const MENU_DATA = ${jsonString};
`;
    return { content: tsContent, filename: 'menu-data.ts' };
  }

  importData(fileContent: string): boolean {
    try {
      let jsonData = fileContent.trim();
      if (jsonData.startsWith('export const MENU_DATA =')) {
        jsonData = jsonData.replace('export const MENU_DATA =', '').replace(/;$/, '').trim();
      }

      const data = JSON.parse(jsonData);
      // Basic validation
      if (
        !data.settings || !data.categories || !data.products || 
        !data.users || !data.deliveryZones || !data.sizes ||
        !data.modifierCategories || !data.toppings
      ) {
        throw new Error("Arquivo JSON/TS inválido ou faltando chaves essenciais.");
      }
      
      this.settings.set(data.settings);
      this.categories.set(data.categories);
      this.products.set(data.products);
      this.users.set(data.users);
      this.deliveryZones.set(data.deliveryZones);
      this.sizes.set(data.sizes);
      this.modifierCategories.set(data.modifierCategories);
      this.toppings.set(data.toppings);
      
      if (data.version) {
        this.saveToLocalStorage('version', data.version);
      }
      
      return true;
    } catch (e) {
      console.error("Erro ao importar dados:", e);
      return false;
    }
  }
}