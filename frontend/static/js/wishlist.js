// /frontend/static/js/wishlist.js

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadCategories();
    loadWishlist();
});

async function loadWishlist() {
    // Hide/show appropriate elements
    document.getElementById('wishlistLoading').classList.remove('d-none');
    document.getElementById('wishlistContent').classList.add('d-none');
    document.getElementById('emptyWishlist').classList.add('d-none');
    document.getElementById('loginRequired').classList.add('d-none');

    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
        document.getElementById('wishlistLoading').classList.add('d-none');
        document.getElementById('loginRequired').classList.remove('d-none');
        return;
    }

    try {
        const response = await fetch('/api/wishlist', {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load wishlist');
        }

        const wishlist = await response.json();

        if (wishlist.items.length === 0) {
            document.getElementById('wishlistLoading').classList.add('d-none');
            document.getElementById('emptyWishlist').classList.remove('d-none');
            return;
        }

        renderWishlistItems(wishlist.items);

        document.getElementById('wishlistLoading').classList.add('d-none');
        document.getElementById('wishlistContent').classList.remove('d-none');
    } catch (error) {
        console.error('Error loading wishlist:', error);
        showToast('Error loading wishlist. Please try again later.', 'error');

        document.getElementById('wishlistLoading').classList.add('d-none');
        document.getElementById('emptyWishlist').classList.remove('d-none');
    }
}

function renderWishlistItems(items) {
    const wishlistItems = document.getElementById('wishlistItems');
    wishlistItems.innerHTML = '';

    items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';

        col.innerHTML = `
            <div class="card h-100 border-0 shadow-sm product-card">
                <div class="position-relative">
                    <img src="${item.image_url || '/frontend/static/images/product-placeholder.jpg'}" 
                         alt="${item.product_name}" 
                         class="card-img-top product-img">
                    <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 remove-wishlist-btn"
                            data-product-id="${item.product_id}" data-item-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="card-body">
                    <h5 class="card-title product-title">${item.product_name}</h5>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-dark">${formatCurrency(item.price)}</span>
                    </div>
                    <div class="d-grid gap-2">
                        <a href="product_detail.html?id=${item.product_id}" class="btn btn-outline-dark">View Details</a>
                        <button class="btn btn-dark add-to-cart-btn" data-product-id="${item.product_id}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;

        wishlistItems.appendChild(col);
    });

    // Add event listeners for the buttons
    document.querySelectorAll('.remove-wishlist-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const itemId = this.getAttribute('data-item-id');
            const productId = this.getAttribute('data-product-id');
            showRemoveConfirmation(itemId, productId);
        });
    });

    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            addToCart(productId);
        });
    });
}

function showRemoveConfirmation(itemId, productId) {
    const modal = new bootstrap.Modal(document.getElementById('removeWishlistItemModal'));
    const confirmButton = document.getElementById('confirmRemoveWishlistItem');

    // Set up event listener for the confirm button
    confirmButton.onclick = function() {
        removeFromWishlist(itemId);
        modal.hide();
    };

    modal.show();
}

async function removeFromWishlist(itemId) {
    const user = getCurrentUser();
    if (!user) {
        showToast('Please log in to manage your wishlist', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/wishlist/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({ item_id: itemId })
        });

        if (!response.ok) {
            throw new Error('Failed to remove item from wishlist');
        }

        // Reload wishlist
        loadWishlist();
        showToast('Item removed from wishlist', 'success');
    } catch (error) {
        console.error('Error removing item from wishlist:', error);
        showToast('Error removing item. Please try again.', 'error');
    }
}

async function addToCart(productId) {
    const user = getCurrentUser();
    if (!user) {
        showToast('Please log in to add items to your cart', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add item to cart');
        }

        // Update cart count
        updateCartCount();
        showToast('Item added to cart', 'success');
    } catch (error) {
        console.error('Error adding item to cart:', error);
        showToast('Error adding item to cart. Please try again.', 'error');
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}