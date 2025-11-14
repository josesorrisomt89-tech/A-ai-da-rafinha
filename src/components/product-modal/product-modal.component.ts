import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Product, Modifier, CartItem, CartTopping, ModifierCategory } from '../../models/product.model';

@Component({
  selector: 'ProductModal',
  templateUrl: './product-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class ProductModalComponent {
  dataService = inject(DataService);

  product = input.required<Product>();
  closeModal = output<void>();
  addToCart = output<void>();

  sizes = computed(() => {
    const p = this.product();
    if (p?.productSpecificSizes && p.productSpecificSizes.length > 0) {
        return p.productSpecificSizes;
    }
    // Only show global sizes for açaí category
    if (p?.categoryId === 'acai') {
        return this.dataService.sizes();
    }
    return [];
  });

  selectedSize = signal<Modifier | null>(null);
  selectedToppings = signal<CartTopping[]>([]);
  notes = signal('');

  constructor() {
    effect(() => {
      const availableSizes = this.sizes();
      this.selectedSize.set(availableSizes[0] ?? null);
    });
  }

  itemTotal = computed(() => {
    const productPrice = this.product()?.basePrice ?? 0;
    const sizePrice = this.selectedSize()?.price ?? 0;
    const toppingsPrice = this.selectedToppings().reduce((sum, item) => sum + (item.topping.price * item.quantity), 0);
    return productPrice + sizePrice + toppingsPrice;
  });

  itemCost = computed(() => {
    const productCost = this.product()?.cost ?? 0;
    const sizeCost = this.selectedSize()?.cost ?? 0;
    const toppingsCost = this.selectedToppings().reduce((sum, item) => sum + (item.topping.cost * item.quantity), 0);
    return productCost + sizeCost + toppingsCost;
  });

  toppingsByCategory = computed(() => {
    const p = this.product();
    if (!p || !p.modifierCategoryIds) {
      return [];
    }

    const allCategories = this.dataService.modifierCategories();
    const allToppings = this.dataService.toppings();

    // Use the product's custom order if available, otherwise fall back to the associated IDs list.
    const orderedIds = p.modifierCategoryOrder && p.modifierCategoryOrder.length > 0
        ? p.modifierCategoryOrder
        : p.modifierCategoryIds;

    // Map over the ordered IDs to build the final structure, ensuring we only include categories that are actually associated.
    return orderedIds
      .map(catId => allCategories.find(c => c.id === catId))
      .filter((cat): cat is ModifierCategory => !!cat) // Filter out any undefined categories
      .map(category => ({
        ...category,
        toppings: allToppings.filter(t => t.modifierCategoryId === category.id)
      }))
      .filter(c => c.toppings.length > 0); // Only show categories that have toppings
  });
  
  isSelectionValid = computed(() => {
    // Rule 1: If sizes exist, one must be selected.
    if (this.sizes().length > 0 && !this.selectedSize()) {
      return false;
    }

    // Rule 2: All required modifier categories must have a selection.
    const requiredCategories = this.toppingsByCategory().filter(cat => cat.isRequired);
    for (const reqCategory of requiredCategories) {
      // Check if any selected topping belongs to this required category
      const hasSelection = this.selectedToppings().some(st => st.topping.modifierCategoryId === reqCategory.id);
      if (!hasSelection) {
        return false;
      }
    }

    // All validation passed
    return true;
  });

  onSizeChange(sizeId: string) {
    const size = this.sizes().find(s => s.id === sizeId) || null;
    this.selectedSize.set(size);
  }

  isToppingSelected(toppingId: string): boolean {
    return this.selectedToppings().some(t => t.topping.id === toppingId);
  }

  handleToppingChange(topping: Modifier, category: ModifierCategory, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    const isSingleChoice = category.maxSelection === 1;

    if (isSingleChoice) {
        // First, remove all other toppings from this category
        const toppingsFromThisCategory = this.dataService.toppings().filter(t => t.modifierCategoryId === category.id);
        this.selectedToppings.update(current => 
            current.filter(ct => !toppingsFromThisCategory.some(t => t.id === ct.topping.id))
        );
        // Then, if checked, add the new one
        if (isChecked) {
             this.selectedToppings.update(current => [...current, { topping, quantity: 1 }]);
        }
    } else { // Multi-choice (checkbox)
        if (isChecked) {
            this.selectedToppings.update(current => [...current, { topping, quantity: 1 }]);
        } else {
            this.selectedToppings.update(current => current.filter(ct => ct.topping.id !== topping.id));
        }
    }
  }

  handleAddToCart() {
    if (!this.isSelectionValid()) return;
    
    // For products without sizes, create a default 'Modifier' so CartItem is valid.
    const sizeForCart: Modifier = this.selectedSize() ?? { id: this.product().id + '-default', name: 'Único', price: 0, cost: 0 };

    const cartItem: Omit<CartItem, 'id'> = {
      product: this.product(),
      size: sizeForCart,
      toppings: this.selectedToppings(),
      notes: this.notes(),
      totalPrice: this.itemTotal(),
      totalCost: this.itemCost(),
    };

    this.dataService.addToCart(cartItem);
    this.addToCart.emit();
    this.closeModal.emit();
  }

  close() {
    this.closeModal.emit();
  }
}