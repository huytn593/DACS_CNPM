document.addEventListener('DOMContentLoaded', function() {
    // Initialize common elements (header, footer, etc.)
    initCommonElements();

    // Load cart contents
    loadCart();

    // Set up event handlers
    setupEventHandlers();
});

// Load cart contents from API
async function loadCart() {
    // Show loading spinner
    document.getElementById('cartLoadingSpinner').style.display = 'block';
    document.getElementById('cartContent').style.display = 'none';
    document.getElementById('emptyCart').style.display = 'none';

    try {
        // Check if user is logged in
        if (!isLoggedIn()) {
            // If not logged in, show empty cart
            document.getElementById('cartLoadingSpinner').style.display = 'none';
            document.getElementById('emptyCart').style.display = 'block';
            return;
        }

        // Fetch cart data from API
        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cart data');
        }

        const cart = await response.json();

        if (!cart.items || cart.items.length === 0) {
            // Cart is empty
            document.getElementById('cartLoadingSpinner').style.display = 'none';
            document.getElementById('emptyCart').style.display = 'block';
            return;
        }

        // Render cart items
        renderCartItems(cart.items);

        // Update cart summary
        updateCartSummary(cart);

        // Hide loading spinner, show cart content
        document.getElementById('cartLoadingSpinner').style.display = 'none';
        document.getElementById('cartContent').style.display = 'block';
    } catch (error) {
        console.error('Error loading cart:', error);
        document.getElementById('cartLoadingSpinner').innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                <p>Failed to load cart. Please try again later.</p>
                <button class="btn btn-outline-primary mt-3" onclick="loadCart()">Retry</button>
            </div>
        `;
    }
}

// Render cart items in the table
function renderCartItems(items) {
    const cartItemsContainer = document.getElementById('cartItems');
    cartItemsContainer.innerHTML = '';

    items.forEach(item => {
        const itemTotal = item.price * item.quantity;

        cartItemsContainer.innerHTML += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${item.image_url || '/static/images/product-placeholder.jpg'}" alt="${item.product_name}" 
                            class="img-thumbnail me-3" style="width: 60px; height: 60px; object-fit: cover;">
                        <div>
                            <a href="product_detail.html?id=${item.product_id}" class="text-decoration-none">
                                <h6 class="mb-0">${item.product_name}</h6>
                            </a>
                            ${item.size ? `<small class="text-muted">Size: ${item.size}</small><br>` : ''}
                            ${item.color ? `<small class="text-muted">Color: ${item.color}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(item.price)}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <span>${item.quantity}</span>
                        <button class="btn btn-sm btn-link edit-quantity-btn" data-item-id="${item.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
                <td>${formatCurrency(itemTotal)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger remove-item-btn" data-item-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Add event listeners to newly created buttons
    document.querySelectorAll('.edit-quantity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            openQuantityModal(itemId);
        });
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            openRemoveItemModal(itemId);
        });
    });
}

// Update cart summary section
function updateCartSummary(cart) {
    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Set shipping fee based on subtotal or chosen method
    const shippingFee = 30000; // Default shipping fee

    // Calculate total
    const total = subtotal + shippingFee;

    // Update UI
    document.getElementById('cartSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('shippingFee').textContent = formatCurrency(shippingFee);
    document.getElementById('cartTotal').textContent = formatCurrency(total);

    // Update cart count in header
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        el.textContent = cart.items.length;
    });
}

// Set up all event handlers
function setupEventHandlers() {
    // Checkout button
    document.getElementById('checkoutBtn').addEventListener('click', proceedToCheckout);

    // Clear cart button
    document.getElementById('clearCartBtn').addEventListener('click', openClearCartModal);

    // Confirm clear cart button (in modal)
    document.getElementById('confirmClearBtn').addEventListener('click', clearCart);

    // Update quantity button (in modal)
    document.getElementById('updateQuantityBtn').addEventListener('click', updateItemQuantity);

    // Confirm remove item button (in modal)
    document.getElementById('confirmRemoveBtn').addEventListener('click', removeCartItem);

    // Apply promo code button
    document.getElementById('applyPromoBtn').addEventListener('click', applyPromoCode);
}

// Open the quantity update modal
function openQuantityModal(itemId) {
    // Find the item in the cart
    const item = findCartItemById(itemId);
    if (!item) return;

    // Set current values in modal
    document.getElementById('updateItemId').value = itemId;
    document.getElementById('itemQuantity').value = item.quantity;
    document.getElementById('quantityError').style.display = 'none';

    // Show modal
    const quantityModal = new bootstrap.Modal(document.getElementById('quantityModal'));
    quantityModal.show();
}

// Open the remove item confirmation modal
function openRemoveItemModal(itemId) {
    document.getElementById('removeItemId').value = itemId;

    const removeModal = new bootstrap.Modal(document.getElementById('removeItemModal'));
    removeModal.show();
}

// Open the clear cart confirmation modal
function openClearCartModal() {
    const clearCartModal = new bootstrap.Modal(document.getElementById('clearCartModal'));
    clearCartModal.show();
}

// Update item quantity in cart
async function updateItemQuantity() {
    const itemId = document.getElementById('updateItemId').value;
    const newQuantity = parseInt(document.getElementById('itemQuantity').value);

    // Validate quantity
    if (newQuantity < 1) {
        document.getElementById('quantityError').textContent = 'Quantity must be at least 1';
        document.getElementById('quantityError').style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`/api/cart/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                item_id: itemId,
                quantity: newQuantity
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update quantity');
        }

        // Close modal
        const quantityModal = bootstrap.Modal.getInstance(document.getElementById('quantityModal'));
        quantityModal.hide();

        // Reload cart to show updated quantities
        loadCart();

        // Show success message
        showToast('Quantity updated successfully', 'success');
    } catch (error) {
        console.error('Error updating quantity:', error);
        document.getElementById('quantityError').textContent = 'Failed to update quantity. Please try again.';
        document.getElementById('quantityError').style.display = 'block';
    }
}

// Remove item from cart
async function removeCartItem() {
    const itemId = document.getElementById('removeItemId').value;

    try {
        const response = await fetch(`/api/cart/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                item_id: itemId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to remove item');
        }

        // Close modal
        const removeModal = bootstrap.Modal.getInstance(document.getElementById('removeItemModal'));
        removeModal.hide();

        // Reload cart
        loadCart();

        // Show success message
        showToast('Item removed from cart', 'success');
    } catch (error) {
        console.error('Error removing item:', error);
        showToast('Failed to remove item. Please try again.', 'danger');
    }
}

// Clear all items from cart
async function clearCart() {
    try {
        const response = await fetch(`/api/cart/clear`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to clear cart');
        }

        // Close modal
        const clearCartModal = bootstrap.Modal.getInstance(document.getElementById('clearCartModal'));
        clearCartModal.hide();

        // Reload cart (should now be empty)
        loadCart();

        // Show success message
        showToast('Cart cleared successfully', 'success');
    } catch (error) {
        console.error('Error clearing cart:', error);
        showToast('Failed to clear cart. Please try again.', 'danger');
    }
}

// Apply promo code
async function applyPromoCode() {
    const promoCode = document.getElementById('promoCode').value.trim();

    if (!promoCode) {
        document.getElementById('promoError').textContent = 'Please enter a promo code';
        document.getElementById('promoError').style.display = 'block';
        document.getElementById('promoSuccess').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/api/cart/promo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                code: promoCode
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Invalid promo code');
        }

        // Show success message
        document.getElementById('promoSuccess').textContent = `Promo code applied! ${data.discount_percent}% discount`;
        document.getElementById('promoSuccess').style.display = 'block';
        document.getElementById('promoError').style.display = 'none';

        // Reload cart to update totals
        loadCart();
    } catch (error) {
        console.error('Error applying promo code:', error);
        document.getElementById('promoError').textContent = error.message || 'Invalid promo code';
        document.getElementById('promoError').style.display = 'block';
        document.getElementById('promoSuccess').style.display = 'none';
    }
}

// Proceed to checkout
function proceedToCheckout() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        // Show login reminder modal
        const loginModal = new bootstrap.Modal(document.getElementById('loginReminderModal'));
        loginModal.show();
        return;
    }

    // Redirect to checkout page
    window.location.href = 'checkout.html';
}

// Helper function to find cart item by ID
function findCartItemById(itemId) {
    const cartItems = document.querySelectorAll('.edit-quantity-btn');
    for (const btn of cartItems) {
        if (btn.getAttribute('data-item-id') === itemId) {
            const row = btn.closest('tr');
            const quantity = parseInt(row.querySelector('td:nth-child(3) span').textContent);
            return { id: itemId, quantity: quantity };
        }
    }
    return null;
}