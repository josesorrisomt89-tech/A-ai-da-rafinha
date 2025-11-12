import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Product, Category, Modifier, ModifierCategory, CartItem, Order, AppSettings, DeliveryZone, Expense, AccountPayable, User, CashRegisterSession, OrderStatus, PaymentStatus } from '../models/product.model';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notification.service';

// FIX: Explicitly type MOCK_DATA to prevent type inference issues, especially with the User's permissions array.
const MOCK_DATA: {
  settings: AppSettings;
  categories: Category[];
  sizes: Modifier[];
  modifierCategories: ModifierCategory[];
  toppings: Modifier[];
  products: Product[];
  users: User[];
  deliveryZones: DeliveryZone[];
  orders: Order[];
} = {
  settings: {
    storeName: "Açaí da Rafinha",
    document: "12.345.678/0001-99",
    address: "Rua das Flores, 123 - Centro",
    phone: "11 1234-5678",
    whatsappNumber: "5511999998888",
    instagramUrl: "https://instagram.com/acai.da.rafinha",
    facebookUrl: "https://facebook.com/acai.da.rafinha",
    logoUrl: "https://i.imgur.com/U2uO2jb.png", // Sample logo
    bannerUrl: "https://i.imgur.com/cLVmD3O.jpeg", // Sample banner
    promoBanners: [
      "https://i.imgur.com/gK2xApS.jpeg",
      "https://i.imgur.com/k2gYjNE.jpeg"
    ],
    minDeliveryTime: 30,
    maxDeliveryTime: 50,
    minOrderValue: 15.00,
    freeDeliveryThreshold: 70.00,
    greetingMessage: "Seja bem-vindo(a)! Escolha seu açaí e aproveite.",
    isTemporarilyClosed: false,
    temporaryClosureMessage: "Voltamos em breve!",
    openingHours: [
      { day: 'Domingo', isOpen: true, open: '14:00', close: '22:00' },
      { day: 'Segunda', isOpen: false, open: '18:00', close: '23:00' },
      { day: 'Terça', isOpen: true, open: '18:00', close: '23:00' },
      { day: 'Quarta', isOpen: true, open: '18:00', close: '23:00' },
      { day: 'Quinta', isOpen: true, open: '18:00', close: '23:00' },
      { day: 'Sexta', isOpen: true, open: '18:00', close: '00:00' },
      { day: 'Sábado', isOpen: true, open: '14:00', close: '00:00' },
    ],
    fiadoSurchargePercentage: 5, // 5% surcharge for credit sales
    primaryColor: '#6a0dad', // A nice purple
    primaryColorHover: '#530a8a',
    primaryColorLightTint: '#6a0dad1a',
    accentColor: '#ff69b4', // Hot pink accent
    textColorOnPrimary: '#ffffff',
    backgroundColorPage: '#f3e5f5', // Light purple background
    backgroundColorCard: '#ffffff',
    textColorPrimary: '#333333',
    textColorSecondary: '#666666',
    borderColor: '#e0e0e0',
  },
  categories: [
    { id: 'acai', name: 'Açaí' },
    { id: 'sorvetes', name: 'Sorvetes' },
    { id: 'bebidas', name: 'Bebidas' },
  ],
  sizes: [ // Global sizes for açaí
    { id: 'size_300', name: '300ml', price: 12.00, cost: 4.00 },
    { id: 'size_500', name: '500ml', price: 16.00, cost: 6.00 },
    { id: 'size_700', name: '700ml', price: 20.00, cost: 8.00 },
  ],
  modifierCategories: [
    { id: 'frutas', name: 'Frutas', isRequired: false, maxSelection: 5 },
    { id: 'coberturas', name: 'Coberturas', isRequired: true, maxSelection: 1 },
    { id: 'graos', name: 'Grãos e Cereais', isRequired: false, maxSelection: 5 },
    { id: 'doces', name: 'Doces', isRequired: false, maxSelection: 3 },
  ],
  toppings: [
    // Frutas
    { id: 'fruta_banana', modifierCategoryId: 'frutas', name: 'Banana', price: 2.00, cost: 0.50 },
    { id: 'fruta_morango', modifierCategoryId: 'frutas', name: 'Morango', price: 2.50, cost: 0.80 },
    { id: 'fruta_kiwi', modifierCategoryId: 'frutas', name: 'Kiwi', price: 2.50, cost: 0.70 },
    // Coberturas
    { id: 'cob_leite_cond', modifierCategoryId: 'coberturas', name: 'Leite Condensado', price: 1.50, cost: 0.40 },
    { id: 'cob_chocolate', modifierCategoryId: 'coberturas', name: 'Cobertura de Chocolate', price: 1.50, cost: 0.40 },
    { id: 'cob_morango', modifierCategoryId: 'coberturas', name: 'Cobertura de Morango', price: 1.50, cost: 0.40 },
    // Grãos
    { id: 'grao_granola', modifierCategoryId: 'graos', name: 'Granola', price: 1.00, cost: 0.30 },
    { id: 'grao_leite_po', modifierCategoryId: 'graos', name: 'Leite em Pó', price: 2.00, cost: 0.60 },
    // Doces
    { id: 'doce_confete', modifierCategoryId: 'doces', name: 'Confete', price: 1.50, cost: 0.50 },
    { id: 'doce_bis', modifierCategoryId: 'doces', name: 'Bis', price: 2.00, cost: 0.70 },
  ],
  products: [
    { id: 'acai_tradicional', name: 'Açaí Tradicional', description: 'O clássico açaí batido com banana.', imageUrl: 'https://i.imgur.com/uFw24a5.jpeg', basePrice: 0, cost: 0, categoryId: 'acai', productSpecificSizes: [], modifierCategoryIds: ['frutas', 'coberturas', 'graos', 'doces'] },
    { id: 'sorvete_creme', name: 'Sorvete de Creme', description: 'Sorvete cremoso sabor baunilha.', imageUrl: 'https://i.imgur.com/Yw1j8p3.jpeg', basePrice: 8, cost: 2.5, categoryId: 'sorvetes', productSpecificSizes: [], modifierCategoryIds: [] },
    { id: 'coca_lata', name: 'Coca-Cola Lata', description: '350ml', imageUrl: 'https://i.imgur.com/GzSp5S0.jpeg', basePrice: 5.00, cost: 2.00, categoryId: 'bebidas', productSpecificSizes: [], modifierCategoryIds: [] },
    { id: 'agua_sem_gas', name: 'Água sem Gás', description: '500ml', imageUrl: 'https://i.imgur.com/o5Qk9gT.jpeg', basePrice: 3.00, cost: 1.00, categoryId: 'bebidas', productSpecificSizes: [], modifierCategoryIds: [] },
  ],
  users: [
      { id: 'user_admin', name: 'Admin', pin: '1234', isAdmin: true, permissions: [] },
      { id: 'user_caixa', name: 'Caixa', pin: '1111', isAdmin: false, permissions: ['access_pos'] },
      { id: 'user_cozinha', name: 'Cozinha', pin: '2222', isAdmin: false, permissions: ['access_kitchen'] }
  ],
  deliveryZones: [
      { id: 'zona_1', neighborhood: 'Centro', fee: 5.00 },
      { id: 'zona_2', neighborhood: 'Vila Nova', fee: 7.00 },
  ],
  orders: []
};


@Injectable({ providedIn: 'root' })
export class DataService {
  private notificationService = inject(NotificationService);

  // Core Data Signals
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  sizes = signal<Modifier[]>([]); // Global sizes for açaí
  toppings = signal<Modifier[]>([]);
  modifierCategories = signal<ModifierCategory[]>([]);
  settings = signal<AppSettings>(MOCK_DATA.settings);
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
    // for the admin user. Customers will still get the MOCK_DATA on first load.
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
      localStorage.setItem(`acai_app_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }

  private loadFromLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`acai_app_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return defaultValue;
    }
  }

  private loadInitialData() {
    // Try to load from localStorage first. If it doesn't exist, fall back to MOCK_DATA.
    // This makes changes in the admin panel persistent for the user making them.
    // New customers will get the MOCK_DATA version until the code is updated.
    this.products.set(this.loadFromLocalStorage('products', MOCK_DATA.products));
    this.categories.set(this.loadFromLocalStorage('categories', MOCK_DATA.categories));
    this.sizes.set(this.loadFromLocalStorage('sizes', MOCK_DATA.sizes));
    this.toppings.set(this.loadFromLocalStorage('toppings', MOCK_DATA.toppings));
    this.modifierCategories.set(this.loadFromLocalStorage('modifierCategories', MOCK_DATA.modifierCategories));
    this.settings.set(this.loadFromLocalStorage('settings', MOCK_DATA.settings));
    this.deliveryZones.set(this.loadFromLocalStorage('deliveryZones', MOCK_DATA.deliveryZones));
    this.users.set(this.loadFromLocalStorage('users', MOCK_DATA.users));

    // Load transactional data
    this.orders.set(this.loadFromLocalStorage('orders', []));
    this.expenses.set(this.loadFromLocalStorage('expenses', []));
    this.accountsPayable.set(this.loadFromLocalStorage('accountsPayable', []));
    this.cashRegisterHistory.set(this.loadFromLocalStorage('cashRegisterHistory', []));
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
  placeOnlineOrder(details: { customerName: string; customerPhone: string; customerAddress: string; paymentMethod: string; neighborhood: string; deliveryFee: number; }): Order {
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
      paymentStatus: 'pending'
    };
    this.orders.update(current => [newOrder, ...current]);
    this.notificationService.notifyNewOrder();
    this.clearCart();
    return newOrder;
  }
  
  updateOrderStatus(orderId: string, status: OrderStatus) {
    this.orders.update(orders => orders.map(o => o.id === orderId ? { ...o, status } : o));
  }
  
  updateOrderPaymentStatus(orderId: string, status: PaymentStatus) {
    this.orders.update(orders => orders.map(o => o.id === orderId ? { ...o, paymentStatus: status } : o));
  }

  // --- AUTH ---
  login(pin: string): boolean {
    const user = this.users().find(u => u.pin === pin);
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
  exportDataForUpdate(): string {
    const dataToExport = {
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
    return JSON.stringify(dataToExport, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      // Basic validation
      if (
        !data.settings || !data.categories || !data.products || 
        !data.users || !data.deliveryZones || !data.sizes ||
        !data.modifierCategories || !data.toppings
      ) {
        throw new Error("Arquivo JSON inválido ou faltando chaves essenciais.");
      }
      
      this.settings.set(data.settings);
      this.categories.set(data.categories);
      this.products.set(data.products);
      this.users.set(data.users);
      this.deliveryZones.set(data.deliveryZones);
      this.sizes.set(data.sizes);
      this.modifierCategories.set(data.modifierCategories);
      this.toppings.set(data.toppings);
      
      // The effect() in constructor will handle saving to localStorage
      return true;
    } catch (e) {
      console.error("Erro ao importar dados:", e);
      return false;
    }
  }
}
