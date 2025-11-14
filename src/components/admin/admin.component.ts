import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { Product, Category, Modifier, ModifierCategory, Order, OrderStatus, AppSettings, DeliveryZone, Expense, AccountPayable, User, Permission, PaymentStatus } from '../../models/product.model';
import { v4 as uuidv4 } from 'uuid';

type AdminView = 'orders' | 'cash_register' | 'finance' | 'products' | 'modifiers' | 'categories' | 'delivery' | 'settings';
type ModalType = 'none' | 'product' | 'category' | 'modifier_group' | 'modifier' | 'delivery_zone' | 'user' | 'expense' | 'payable' | 'open_cash_register' | 'close_cash_register' | 'view_order';
type FinanceTab = 'expenses' | 'payable' | 'receivable';
type SettingsTab = 'store' | 'menu' | 'operational' | 'appearance';


@Component({
  selector: 'Admin',
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class AdminComponent {
  dataService = inject(DataService);
  // FIX: Inject NotificationService to handle notification sounds.
  notificationService = inject(NotificationService);
  
  // --- STATE ---
  activeAdminView = signal<AdminView>('orders');
  activeModal = signal<ModalType>('none');
  
  // Settings specific state
  activeSettingsTab = signal<SettingsTab>('store');
  
  // Finance specific state
  activeFinanceTab = signal<FinanceTab>('expenses');

  // Signals for holding the item being edited in a modal
  editingProduct = signal<Product | null>(null);
  editingCategory = signal<Category | null>(null);
  editingModifierGroup = signal<ModifierCategory | null>(null);
  editingModifier = signal<Modifier | null>(null);
  editingDeliveryZone = signal<DeliveryZone | null>(null);
  editingUser = signal<User | null>(null);
  editingExpense = signal<Expense | null>(null);
  editingPayable = signal<AccountPayable | null>(null);
  viewingOrder = signal<Order | null>(null);
  
  // Local state for modals/forms that don't map directly to a model
  itemToDelete: { id: string, type: string } | null = null;
  newModifierParentGroup: ModifierCategory | null = null;
  startingCash = signal<number | null>(null);
  
  // This is a temporary copy for the form to avoid two-way binding directly to the service's signal
  settings = signal<AppSettings>(this.dataService.settings());

  // --- LIFECYCLE ---
  constructor() {
    // When settings() from the service changes, update our local copy.
    effect(() => {
        this.settings.set(JSON.parse(JSON.stringify(this.dataService.settings())));
    });
  }

  // --- COMPUTED ---
  currentUser = computed(() => this.dataService.currentUser());

  hasPermission(permission: Permission): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.isAdmin || user.permissions.includes(permission);
  }

  sidebarNavItems = computed(() => [
    { id: 'orders', label: 'Pedidos', icon: '🛒', permission: 'access_orders' },
    { id: 'cash_register', label: 'Caixa Diário', icon: '💰', permission: 'access_cash_register' },
    { id: 'finance', label: 'Financeiro', icon: '📊', permission: 'access_finance' },
    { id: 'products', label: 'Produtos', icon: '🍔', permission: 'access_products' },
    { id: 'modifiers', label: 'Adicionais', icon: '✨', permission: 'access_modifiers' },
    { id: 'categories', label: 'Categorias', icon: '📚', permission: 'access_categories' },
    { id: 'delivery', label: 'Áreas de Entrega', icon: '🚚', permission: 'access_delivery' },
    { id: 'settings', label: 'Configurações', icon: '⚙️', permission: 'access_settings' },
  ].filter(item => this.hasPermission(item.permission as Permission)));


  // Order Status Columns
  pendingOrders = computed(() => this.dataService.orders().filter(o => o.isOnlineOrder && o.status === 'pending' && (!o.scheduledDeliveryTime || o.scheduledDeliveryTime <= Date.now())).sort((a,b) => a.timestamp - b.timestamp));
  scheduledOrders = computed(() => this.dataService.orders().filter(o => o.isOnlineOrder && o.status === 'pending' && o.scheduledDeliveryTime && o.scheduledDeliveryTime > Date.now()).sort((a,b) => a.scheduledDeliveryTime! - b.scheduledDeliveryTime!));
  confirmedOrders = computed(() => this.dataService.orders().filter(o => o.isOnlineOrder && o.status === 'accepted').sort((a,b) => a.timestamp - b.timestamp));
  preparingOrders = computed(() => this.dataService.orders().filter(o => o.isOnlineOrder && o.status === 'preparing').sort((a,b) => a.timestamp - b.timestamp));
  awaitingDeliveryOrders = computed(() => this.dataService.orders().filter(o => o.isOnlineOrder && o.status === 'awaiting_delivery').sort((a,b) => a.timestamp - b.timestamp));
  outForDeliveryOrders = computed(() => this.dataService.orders().filter(o => o.isOnlineOrder && o.status === 'out_for_delivery').sort((a,b) => a.timestamp - b.timestamp));
  
  groupedModifiers = computed(() => {
    const groups = this.dataService.modifierCategories();
    const allModifiers = this.dataService.toppings();
    return groups.map(group => ({
      ...group,
      modifiers: allModifiers.filter(m => m.modifierCategoryId === group.id)
    }));
  });
  
  accountsReceivable = computed(() => this.dataService.orders().filter(o => o.paymentMethod === 'fiado' && o.paymentStatus === 'unpaid'));

  sortedDeliveryZones = computed(() => {
    return [...this.dataService.deliveryZones()].sort((a, b) => a.neighborhood.localeCompare(b.neighborhood));
  });

  // This computed signal will prepare the list of modifier groups for the editing modal.
  // It will show selected groups first, in their custom order, followed by unselected groups.
  productModifierGroupsForEditing = computed(() => {
    const product = this.editingProduct();
    if (!product) return [];

    const allGroups = this.dataService.modifierCategories();
    const selectedGroupIds = new Set(product.modifierCategoryIds || []);
    
    const orderedSelectedIds = product.modifierCategoryOrder || (product.modifierCategoryIds || []);

    const selectedGroups = orderedSelectedIds
        .map(id => allGroups.find(g => g.id === id))
        .filter((g): g is ModifierCategory => !!g);

    const unselectedGroups = allGroups.filter(g => !selectedGroupIds.has(g.id));

    return [...selectedGroups, ...unselectedGroups];
  });

  // --- MODAL & FORM HANDLING ---
  openModal(type: ModalType) { this.activeModal.set(type); }
  closeModal() {
    this.activeModal.set('none');
    this.itemToDelete = null;
    this.newModifierParentGroup = null;
    this.editingProduct.set(null);
    this.editingCategory.set(null);
    this.editingModifierGroup.set(null);
    this.editingModifier.set(null);
    this.editingDeliveryZone.set(null);
    this.editingUser.set(null);
    this.editingExpense.set(null);
    this.editingPayable.set(null);
    this.viewingOrder.set(null);
  }

  // --- CRUD ACTIONS ---
  
  // Generic open/save/delete for simple models
  startNew(type: 'category' | 'modifier_group' | 'delivery_zone' | 'user' | 'expense' | 'payable') {
    if (type === 'category') { this.editingCategory.set({ id: 'new_' + uuidv4(), name: '' }); }
    if (type === 'modifier_group') { this.editingModifierGroup.set({ id: 'new_' + uuidv4(), name: '', isRequired: false, maxSelection: 1 }); }
    if (type === 'delivery_zone') { this.editingDeliveryZone.set({ id: 'new_' + uuidv4(), neighborhood: '', fee: 0 }); }
    if (type === 'user') { this.editingUser.set({ id: 'new_' + uuidv4(), name: '', password: '', isAdmin: false, permissions: [] }); }
    if (type === 'expense') { this.editingExpense.set({ id: 'new_' + uuidv4(), description: '', amount: 0, date: new Date().toISOString().split('T')[0] }); }
    if (type === 'payable') { this.editingPayable.set({ id: 'new_' + uuidv4(), description: '', amount: 0, dueDate: new Date().toISOString().split('T')[0], isPaid: false }); }
    this.openModal(type);
  }

  editItem(item: any, type: ModalType) {
    if (type === 'category') this.editingCategory.set({ ...item });
    if (type === 'modifier_group') this.editingModifierGroup.set({ ...item });
    if (type === 'delivery_zone') this.editingDeliveryZone.set({ ...item });
    if (type === 'user') this.editingUser.set({ ...item, permissions: [...item.permissions] });
    if (type === 'expense') this.editingExpense.set({ ...item });
    if (type === 'payable') this.editingPayable.set({ ...item });
    this.openModal(type);
  }

  saveItem(type: 'category' | 'modifier_group' | 'delivery_zone' | 'user' | 'expense' | 'payable') {
    if (type === 'category' && this.editingCategory()) this.dataService.saveCategory(this.editingCategory()!);
    if (type === 'modifier_group' && this.editingModifierGroup()) this.dataService.saveModifierCategory(this.editingModifierGroup()!);
    if (type === 'delivery_zone' && this.editingDeliveryZone()) this.dataService.saveDeliveryZone(this.editingDeliveryZone()!);
    if (type === 'user' && this.editingUser()) this.dataService.saveUser(this.editingUser()!);
    if (type === 'expense' && this.editingExpense()) this.dataService.saveExpense(this.editingExpense()!);
    if (type === 'payable' && this.editingPayable()) this.dataService.saveAccountPayable(this.editingPayable()!);
    this.closeModal();
  }
  
  // Special cases: Product, Modifier
  startNewProduct() {
    this.editingProduct.set({ id: 'new_' + uuidv4(), name: '', description: '', info: '', basePrice: 0, cost: 0, categoryId: '', modifierCategoryIds: [], modifierCategoryOrder: [], productSpecificSizes: [] });
    this.openModal('product');
  }

  editProduct(product: Product) {
    const productCopy = JSON.parse(JSON.stringify(product));
    // Ensure modifierCategoryOrder exists if modifierCategoryIds does, for backward compatibility
    if (productCopy.modifierCategoryIds && !productCopy.modifierCategoryOrder) {
        productCopy.modifierCategoryOrder = [...productCopy.modifierCategoryIds];
    }
    this.editingProduct.set(productCopy);
    this.openModal('product');
  }

  saveProduct() {
    if (this.editingProduct()) {
      this.dataService.saveProduct(this.editingProduct()!);
      this.closeModal();
    }
  }

  startNewModifier(group: ModifierCategory) {
    this.newModifierParentGroup = group;
    this.editingModifier.set({ id: 'new_' + uuidv4(), name: '', price: 0, cost: 0, modifierCategoryId: group.id });
    this.openModal('modifier');
  }

  editModifier(modifier: Modifier) {
    this.editingModifier.set({ ...modifier });
    this.openModal('modifier');
  }
  
  saveModifier() {
    if (this.editingModifier()) {
      this.dataService.saveModifier(this.editingModifier()!);
      this.closeModal();
    }
  }
  
  // Deletion
  confirmDelete(id: string, type: string) {
    this.itemToDelete = { id, type };
  }

  executeDelete() {
    if (!this.itemToDelete) return;
    const { id, type } = this.itemToDelete;
    if (type === 'product') this.dataService.deleteProduct(id);
    if (type === 'category') this.dataService.deleteCategory(id);
    if (type === 'modifier_group') this.dataService.deleteModifierCategory(id);
    if (type === 'modifier') this.dataService.deleteModifier(id);
    if (type === 'delivery_zone') this.dataService.deleteDeliveryZone(id);
    if (type === 'user') this.dataService.deleteUser(id);
    if (type === 'expense') this.dataService.deleteExpense(id);
    if (type === 'payable') this.dataService.deleteAccountPayable(id);
    this.closeModal();
  }
  
  // --- ORDER MANAGEMENT ---
  acceptOrder(order: Order) {
    this.dataService.updateOrderStatus(order.id, 'accepted');
    // FIX: Call stopNewOrderSound from the correct service (NotificationService).
    this.notificationService.stopNewOrderSound();
  }

  cancelOrder(order: Order) {
    this.dataService.updateOrderStatus(order.id, 'cancelled');
    // FIX: Call stopNewOrderSound from the correct service (NotificationService).
    this.notificationService.stopNewOrderSound();
  }
  
  sendForDelivery(order: Order) {
    this.dataService.updateOrderStatus(order.id, 'out_for_delivery');
  }

  markAsDelivered(order: Order) {
    this.dataService.updateOrderStatus(order.id, 'delivered');
  }
  
  viewOrder(order: Order) {
      this.viewingOrder.set(order);
      this.openModal('view_order');
  }

  // --- SETTINGS ---
  saveSettings() {
    this.dataService.updateSettings(this.settings());
    alert('Configurações salvas!');
  }
  
  // --- CASH REGISTER ---
  openCashRegisterModal() {
    this.startingCash.set(null);
    this.openModal('open_cash_register');
  }
  
  handleOpenCashRegister() {
    if (this.startingCash() !== null && this.startingCash()! >= 0) {
      this.dataService.openCashRegister(this.startingCash()!);
      this.closeModal();
    }
  }
  
  handleCloseCashRegister() {
     this.dataService.closeCashRegister();
     this.closeModal();
  }

  // --- DATA IMPORT/EXPORT ---
  exportData() {
    try {
        const { content, filename } = this.dataService.exportDataForUpdate();
        const blob = new Blob([content], { type: 'application/typescript' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert(`Arquivo "${filename}" exportado com sucesso! Siga as instruções para atualizar o cardápio público.`);
    } catch (e) {
        console.error("Erro ao exportar dados:", e);
        alert('Ocorreu um erro ao tentar exportar os dados.');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (this.dataService.importData(text)) {
        alert('Dados importados com sucesso! A página será recarregada para aplicar as alterações.');
        window.location.reload();
      } else {
        alert('Erro ao importar o arquivo. Verifique se o arquivo "menu.json" ou "menu-data.ts" é válido e não foi corrompido.');
      }
    };
    reader.onerror = () => {
        alert('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsText(file);
    input.value = ''; // Reset input to allow re-selection of the same file
  }

  // --- HELPERS ---
  
  addProductSpecificSize() {
    this.editingProduct.update(p => {
      if (!p) return p;
      const newSize = {id: uuidv4(), name: '', price: 0, cost: 0};
      const existingSizes = p.productSpecificSizes || [];
      // If we add a specific size, the base price is no longer used and should be 0.
      return { ...p, basePrice: 0, productSpecificSizes: [...existingSizes, newSize] };
    });
  }

  moveModifierCategory(index: number, direction: 'up' | 'down') {
    const categories = this.dataService.modifierCategories();
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= categories.length) {
      return;
    }
    
    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(index, 1);
    newCategories.splice(newIndex, 0, movedItem);
    
    this.dataService.reorderModifierCategories(newCategories);
  }

  moveModifierGroupForProduct(groupId: string, direction: 'up' | 'down') {
    this.editingProduct.update(p => {
        if (!p) return p;

        const currentOrder = p.modifierCategoryOrder || [...(p.modifierCategoryIds || [])];
        const index = currentOrder.indexOf(groupId);
        if (index === -1) return p;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= currentOrder.length) {
            return p;
        }

        const newOrder = [...currentOrder];
        const [movedItem] = newOrder.splice(index, 1);
        newOrder.splice(newIndex, 0, movedItem);

        return { ...p, modifierCategoryOrder: newOrder };
    });
  }

  handleImageUpload(event: Event, callback: (base64: string) => void) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(input.files[0]);
    }
    input.value = ''; // Reset input
  }
  
  onProductImageChange(event: Event) {
    if (!this.editingProduct()) return;
    this.handleImageUpload(event, (base64) => {
      this.editingProduct.update(p => ({ ...p!, imageUrl: base64 }));
    });
  }
  
  onLogoChange(event: Event) {
    this.handleImageUpload(event, (base64) => {
      this.settings.update(s => ({ ...s, logoUrl: base64 }));
    });
  }
  
  onBannerChange(event: Event) {
    this.handleImageUpload(event, (base64) => {
      this.settings.update(s => ({ ...s, bannerUrl: base64 }));
    });
  }
  
  addPromoBanner(event: Event) {
    this.handleImageUpload(event, (base64) => {
       this.settings.update(s => ({...s, promoBanners: [...s.promoBanners, base64]}));
    });
  }

  removePromoBanner(index: number) {
    this.settings.update(s => ({...s, promoBanners: s.promoBanners.filter((_, i) => i !== index)}));
  }
  
  togglePermission(permission: Permission, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.editingUser.update(user => {
      if (!user) return null;
      const currentPermissions = user.permissions || [];
      if (isChecked) {
        return { ...user, permissions: [...currentPermissions, permission] };
      } else {
        return { ...user, permissions: currentPermissions.filter(p => p !== permission) };
      }
    });
  }
  
  toggleUserIsAdmin(event: Event) {
      const isChecked = (event.target as HTMLInputElement).checked;
      this.editingUser.update(user => user ? { ...user, isAdmin: isChecked } : null);
  }
  
  paymentStatuses: { key: PaymentStatus, text: string }[] = [
    { key: 'pending', text: 'Pendente' },
    { key: 'paid', text: 'Pago' },
    { key: 'unpaid', text: 'Não Pago' },
  ];

  getPaymentStatusText(status: PaymentStatus): string {
    return this.paymentStatuses.find(s => s.key === status)?.text ?? 'Desconhecido';
  }

  togglePayableStatus(payable: AccountPayable) {
    this.dataService.toggleAccountPaidStatus(payable.id, 'payable');
  }

  markReceivableAsPaid(order: Order) {
    this.dataService.updateOrderPaymentStatus(order.id, 'paid');
  }
  
  getCategoryName(categoryId: string): string {
    return this.dataService.categories().find(c => c.id === categoryId)?.name ?? 'Sem categoria';
  }
  
  toggleModifierCategoryForProduct(groupId: string, event: Event) {
    if (!this.editingProduct()) return;
    const isChecked = (event.target as HTMLInputElement).checked;

    this.editingProduct.update(p => {
        if (!p) return null;

        const currentIds = new Set(p.modifierCategoryIds || []);
        let currentOrder = p.modifierCategoryOrder || [...(p.modifierCategoryIds || [])];

        if (isChecked) {
            currentIds.add(groupId);
            if (!currentOrder.includes(groupId)) {
                // Add to the end of the order list when checked
                currentOrder.push(groupId);
            }
        } else {
            currentIds.delete(groupId);
            // Remove from the order list when unchecked
            currentOrder = currentOrder.filter(id => id !== groupId);
        }

        return { 
            ...p, 
            modifierCategoryIds: Array.from(currentIds),
            modifierCategoryOrder: currentOrder
        };
    });
  }
}
