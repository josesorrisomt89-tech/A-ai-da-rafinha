// FIX: The frontmatter-style text at the top of the file is not valid TypeScript and was causing compilation errors. It has been converted into a block comment.
/*
---
created_date: 2024-10-14
author: an AI assistant
---
*/
export interface Product {
  id: string;
  name: string;
  description?: string;
  info?: string;
  imageUrl?: string;
  basePrice: number;
  cost: number;
  categoryId: string;
  productSpecificSizes: Modifier[];
  modifierCategoryIds: string[];
  modifierCategoryOrder?: string[];
}

export interface Category {
  id: string;
  name: string;
}

export interface ModifierCategory {
    id: string;
    name: string;
    isRequired: boolean;
    maxSelection: number; // 1 for single-choice (radio), >1 for multi-choice (checkbox)
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  cost: number;
  modifierCategoryId?: string; // For toppings
}

export interface CartTopping {
  topping: Modifier;
  quantity: number;
}

export interface CartItem {
  id: string; // Unique ID for this specific cart item instance
  product: Product;
  size: Modifier;
  toppings: CartTopping[];
  notes: string;
  totalPrice: number;
  totalCost: number;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'awaiting_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'unpaid';

export interface Order {
  id: string;
  timestamp: number;
  items: CartItem[];
  total: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  neighborhood: string;
  deliveryFee: number;
  paymentMethod: string;
  status: OrderStatus;
  isOnlineOrder: boolean;
  paymentStatus: PaymentStatus;
  scheduledDeliveryTime?: number;
  referencePoint?: string;
  // Fields for Fiado
  customerCpf?: string;
  paymentDueDate?: string; // YYYY-MM-DD
  surcharge?: number;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string; // YYYY-MM-DD
}

export interface AccountPayable {
    id: string;
    description: string;
    amount: number;
    dueDate: string; // YYYY-MM-DD
    isPaid: boolean;
}

export interface DeliveryZone {
    id: string;
    neighborhood: string;
    fee: number;
}

export interface OpeningHours {
    day: string;
    isOpen: boolean;
    open: string; // "HH:mm"
    close: string; // "HH:mm"
}

export interface AppSettings {
    storeName: string;
    document: string;
    address: string;
    phone: string;
    whatsappNumber: string;
    instagramUrl: string;
    facebookUrl: string;
    logoUrl: string;
    bannerUrl: string;
    promoBanners: string[];
    minDeliveryTime: number;
    maxDeliveryTime: number;
    minOrderValue: number;
    freeDeliveryThreshold: number;
    greetingMessage: string;
    isTemporarilyClosed: boolean;
    temporaryClosureMessage: string;
    openingHours: OpeningHours[];
    fiadoSurchargePercentage: number;
    primaryColor: string;
    primaryColorHover: string;
    primaryColorLightTint: string;
    accentColor: string;
    textColorOnPrimary: string;
    backgroundColorPage: string;
    backgroundColorCard: string;
    textColorPrimary: string;
    textColorSecondary: string;
    borderColor: string;
}

export type Permission = 
    | 'access_pos'
    | 'access_orders'
    | 'access_cash_register'
    | 'access_kitchen'
    | 'access_finance'
    | 'access_products'
    | 'access_modifiers'
    | 'access_categories'
    | 'access_delivery'
    | 'access_settings';

export interface User {
    id: string;
    name: string;
    password: string; // Stored as plain text for this simple app
    isAdmin: boolean;
    permissions: Permission[];
}

export interface CashRegisterSession {
    id: string;
    openingTime: number;
    closingTime: number | null;
    startingBalance: number;
    closingBalance: number | null;
    status: 'open' | 'closed';
}