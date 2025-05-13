// Tải giỏ hàng từ API
async function loadCart() {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        // Chuyển hướng đến trang đăng nhập
        window.location.href = '/login.html?returnUrl=' + encodeURIComponent('/cart.html');
        return;
    }
    
    try {
        const response = await fetch('/cart', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch cart');
        }
        
        const cart = await response.json();
        
        // Hiển thị giỏ hàng
        displayCart(cart);
        
    } catch (error) {
        console.error('Error:', error);
        
        document.getElementById('cartContent').innerHTML = `
            <div class="alert alert-danger">
                Failed to load your cart. Please try again later.
            </div>
        `;
    }
}

// Hiển thị giỏ hàng
function displayCart(cart) {
    const cartContentElement = document.getElementById('cartContent');
    
    // Nếu giỏ hàng trống
    if (!cart.items || cart.items.length === 0) {
        cartContentElement.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-cart fa-4x mb-3 text-muted"></i>
                <h3>Your cart is empty</h3>
                <p class="mb-4">Add some products to your cart and come back here to complete your purchase.</p>
                <a href="/" class="btn btn-primary">Continue Shopping</a>
            </div>
        `;
        return;
    }
    
    // Tính tổng tiền
    const subtotal = cart.items.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
    }, 0);
    
    // Hiển thị các sản phẩm trong giỏ hàng
    cartContentElement.innerHTML = `
        <div class="row">
            <div class="col-lg-8">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title mb-4">Cart Items (${cart.items.length})</h5>
                        
                        <div class="table-responsive">
                            <table class="table align-middle">
                                <thead>
                                    <tr>
                                        <th scope="col">Product</th>
                                        <th scope="col">Price</th>
                                        <th scope="col">Quantity</th>
                                        <th scope="col">Total</th>
                                        <th scope="col"></th>
                                    </tr>
                                </thead>
                                <tbody id="cartItemsList">
                                    ${cart.items.map(item => `
                                        <tr>
                                            <td>
                                                <div class="d-flex align-items-center">
                                                    <img src="${item.product.image || '/static/images/product-placeholder.jpg'}" class="img-thumbnail me-3" style="width: 80px; height: 80px; object-fit: cover;" alt="${item.product.name}">
                                                    <div>
                                                        <h6 class="mb-1">${item.product.name}</h6>
                                                        <small class="text-muted">
                                                            Size: ${item.size || 'N/A'}, 
                                                            Color: ${item.color || 'N/A'}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>${formatCurrency(item.product.price)}</td>
                                            <td>
                                                <div class="input-group" style="width: 120px">
                                                    <button class="btn btn-sm btn-outline-secondary minus-btn" type="button" data-item-id="${item.id}">-</button>
                                                    <input type="text" class="form-control text-center quantity-input" value="${item.quantity}" data-item-id="${item.id}">
                                                    <button class="btn btn-sm btn-outline-secondary plus-btn" type="button" data-item-id="${item.id}">+</button>
                                                </div>
                                            </td>
                                            <td>${formatCurrency(item.product.price * item.quantity)}</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-danger remove-item-btn" data-item-id="${item.id}">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="d-flex justify-content-between mt-3">
                            <a href="/" class="btn btn-outline-secondary">
                                <i class="fas fa-arrow-left me-2"></i> Continue Shopping
                            </a>
                            <button id="clearCartBtn" class="btn btn-outline-danger">
                                <i class="fas fa-trash me-2"></i> Clear Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title mb-4">Order Summary</h5>
                        
                        <div class="d-flex justify-content-between mb-2">
                            <span>Subtotal:</span>
                            <span>${formatCurrency(subtotal)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Shipping:</span>
                            <span>${formatCurrency(30000)}</span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-3 fw-bold">
                            <span>Total:</span>
                            <span>${formatCurrency(subtotal + 30000)}</span>
                        </div>
                        
                        <div class="d-grid">
                            <button id="checkoutBtn" class="btn btn-primary btn-lg">
                                Proceed to Checkout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Thêm event listeners cho các nút
    addCartEventListeners();
}

// Thêm event listeners cho các nút trong giỏ hàng
function addCartEventListeners() {
    // Nút tăng số lượng
    document.querySelectorAll('.plus-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const itemId = button.getAttribute('data-item-id');
            const inputElement = document.querySelector(`.quantity-input[data-item-id="${itemId}"]`);
            const currentQuantity = parseInt(inputElement.value);
            
            await updateCartItemQuantity(itemId, currentQuantity + 1);
        });
    });
    
    // Nút giảm số lượng
    document.querySelectorAll('.minus-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const itemId = button.getAttribute('data-item-id');
            const inputElement = document.querySelector(`.quantity-input[data-item-id="${itemId}"]`);
            const currentQuantity = parseInt(inputElement.value);
            
            if (currentQuantity > 1) {
                await updateCartItemQuantity(itemId, currentQuantity - 1);
            }
        });
    });
    
    // Input số lượng
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', async () => {
            const itemId = input.getAttribute('data-item-id');
            let quantity = parseInt(input.value);
            
            // Đảm bảo số lượng hợp lệ
            if (isNaN(quantity) || quantity < 1) {
                quantity = 1;
                input.value = 1;
            }
            
            await updateCartItemQuantity(itemId, quantity);
        });
    });
    
    // Nút xóa sản phẩm
    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const itemId = button.getAttribute('data-item-id');
            await removeCartItem(itemId);
        });
    });
    
    // Nút xóa toàn bộ giỏ hàng
    document.getElementById('clearCartBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear your cart?')) {
            await clearCart();
        }
    });
    
    // Nút thanh toán
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        window.location.href = '/checkout.html';
    });
}

// Cập nhật số lượng sản phẩm trong giỏ hàng
async function updateCartItemQuantity(itemId, quantity) {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch(`/cart/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                quantity: quantity
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update cart item');
        }
        
        // Tải lại giỏ hàng
        loadCart();
        
        // Cập nhật số lượng sản phẩm trong header
        updateCartCount();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to update cart item. Please try again.', 'danger');
    }
}

// Xóa một sản phẩm khỏi giỏ hàng
async function removeCartItem(itemId) {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch(`/cart/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove cart item');
        }
        
        // Tải lại giỏ hàng
        loadCart();
        
        // Cập nhật số lượng sản phẩm trong header
        updateCartCount();
        
        // Hiển thị thông báo
        showAlert('Item removed from cart.', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to remove cart item. Please try again.', 'danger');
    }
}

// Xóa toàn bộ giỏ hàng
async function clearCart() {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch('/cart', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to clear cart');
        }
        
        // Tải lại giỏ hàng
        loadCart();
        
        // Cập nhật số lượng sản phẩm trong header
        updateCartCount();
        
        // Hiển thị thông báo
        showAlert('Cart cleared successfully.', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to clear cart. Please try again.', 'danger');
    }
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', () => {
    // Tải giỏ hàng
    loadCart();
    
    // Cập nhật trạng thái người dùng trong header
    updateUserState();
    
    // Load danh mục sản phẩm động
    loadCategories();
});