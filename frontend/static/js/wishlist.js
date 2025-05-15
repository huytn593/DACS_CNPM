// wishlist.js - Handles the wishlist functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page elements
    const wishlistItemsContainer = document.getElementById('wishlistItems');
    const emptyWishlistMessage = document.getElementById('emptyWishlist');
    const clearWishlistContainer = document.getElementById('clearWishlistContainer');
    const clearWishlistBtn = document.getElementById('clearWishlistBtn');

    // Load user data and update UI
    updateUserUI();

    // Load wishlist items
    loadWishlist();

    // Event listeners
    if (clearWishlistBtn) {
        clearWishlistBtn.addEventListener('click', clearWishlist);
    }

    // Delegate event listeners for dynamic elements
    wishlistItemsContainer.addEventListener('click', function(event) {
        // Handle remove from wishlist button clicks
        if (event.target.closest('.remove-wishlist-btn')) {
            const productCard = event.target.closest('.product-card');
            const productId = productCard.dataset.productId;
            removeFromWishlist(productId);
            productCard.closest('.col').remove();
            updateWishlistUI();
        }

        // Handle add to cart button clicks
        if (event.target.closest('.add-to-cart-btn')) {
            const productCard = event.target.closest('.product-card');
            const productId = productCard.dataset.productId;
            addToCart(productId);
        }
    });

    // Load categories for the header dropdown
    loadCategories();

    // Update cart count in header
    updateCartCount();
});

// Function to load wishlist items from local storage or API
async function loadWishlist() {
    try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            // If not logged in, redirect to login page
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        // Fetch wishlist items from API
        const response = await fetch('/wishlist', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch wishlist');
        }

        const wishlistData = await response.json();
        displayWishlistItems(wishlistData);
    } catch (error) {
        console.error('Error loading wishlist:', error);
        displayWishlistItems([]);  // Show empty state on error
    }
}

// Function to display wishlist items
function displayWishlistItems(items) {
    const wishlistItemsContainer = document.getElementById('wishlistItems');
    const emptyWishlistMessage = document.getElementById('emptyWishlist');
    const clearWishlistContainer = document.getElementById('clearWishlistContainer');

    // Clear existing content
    wishlistItemsContainer.innerHTML = '';

    if (!items || items.length === 0) {
        // Show empty state if no items
        emptyWishlistMessage.style.display = 'block';
        wishlistItemsContainer.style.display = 'none';
        clearWishlistContainer.style.display = 'none';
        return;
    }

    // Hide empty state, show items and clear button
    emptyWishlistMessage.style.display = 'none';
    wishlistItemsContainer.style.display = 'flex';
    clearWishlistContainer.style.display = 'block';

    // Add each item to the container
    items.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col';

        // Create product card HTML
        col.innerHTML = `
            <div class="card h-100 product-card" data-product-id="${item.id}">
                <div class="position-relative">
                    <img src="${item.image || '/static/images/product-placeholder.jpg'}" class="card-img-top" alt="${item.name}">
                    <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 remove-wishlist-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${item.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-primary fw-bold">$${item.price.toFixed(2)}</span>
                        <div class="rating">
                            ${generateRatingStars(item.rating || 0)}
                        </div>
                    </div>
                    <button class="btn btn-outline-primary d-block w-100 mt-3 add-to-cart-btn">
                        <i class="fas fa-shopping-cart me-2"></i>Add to Cart
                    </button>
                </div>
            </div>
        `;

        wishlistItemsContainer.appendChild(col);
    });
}

// Function to generate star rating HTML
function generateRatingStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star text-warning"></i>';
    }

    // Add half star if needed
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt text-warning"></i>';
    }

    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star text-warning"></i>';
    }

    return stars;
}

// Function to remove item from wishlist
async function removeFromWishlist(productId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Call API to remove from wishlist
        const response = await fetch(`/wishlist/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to remove from wishlist');
        }

        // Show success message (optional)
        showToast('Item removed from wishlist');

        // Check if wishlist is now empty
        updateWishlistUI();
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        showToast('Failed to remove item from wishlist', 'error');
    }
}

// Function to add item to cart
async function addToCart(productId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        // Call API to add to cart
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add to cart');
        }

        // Show success message
        showToast('Item added to cart');

        // Update cart count
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Failed to add item to cart', 'error');
    }
}

// Function to clear the entire wishlist
async function clearWishlist() {
    // Confirm before clearing
    if (!confirm('Are you sure you want to clear your wishlist?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Call API to clear wishlist
        const response = await fetch('/wishlist/clear', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to clear wishlist');
        }

        // Update UI to show empty state
        document.getElementById('wishlistItems').innerHTML = '';
        updateWishlistUI();

        // Show success message
        showToast('Wishlist cleared successfully');
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        showToast('Failed to clear wishlist', 'error');
    }
}

// Function to update the UI based on wishlist state
function updateWishlistUI() {
    const wishlistItems = document.querySelectorAll('#wishlistItems .col');
    const emptyWishlistMessage = document.getElementById('emptyWishlist');
    const clearWishlistContainer = document.getElementById('clearWishlistContainer');

    if (wishlistItems.length === 0) {
        emptyWishlistMessage.style.display = 'block';
        document.getElementById('wishlistItems').style.display = 'none';
        clearWishlistContainer.style.display = 'none';
    } else {
        emptyWishlistMessage.style.display = 'none';
        document.getElementById('wishlistItems').style.display = 'flex';
        clearWishlistContainer.style.display = 'block';
    }
}

// Function to show toast messages
function showToast(message, type = 'success') {
    // Check if toast container exists, create if not
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'text-bg-danger' : 'text-bg-success'}`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Set toast content
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">${type === 'error' ? 'Error' : 'Success'}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Function to load categories for the header
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }

        const categories = await response.json();
        const categoryMenu = document.getElementById('categoryMenu');

        // Clear existing categories
        categoryMenu.innerHTML = '';

        // Add each category to the menu
        categories.forEach(category => {
            const li = document.createElement('li');
            li.innerHTML = `<a class="dropdown-item" href="/products.html?category=${encodeURIComponent(category.name)}">${category.name}</a>`;
            categoryMenu.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Function to update cart count in header
async function updateCartCount() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            document.getElementById('cartCount').textContent = '0';
            return;
        }

        const response = await fetch('/cart/count', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cart count');
        }

        const data = await response.json();
        document.getElementById('cartCount').textContent = data.count;
    } catch (error) {
        console.error('Error updating cart count:', error);
        document.getElementById('cartCount').textContent = '0';
    }
}

// Function to update the user UI elements in the header
function updateUserUI() {
    const token = localStorage.getItem('token');
    const userDropdown = document.getElementById('userDropdown');

    if (token) {
        // User is logged in
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userDropdown.innerHTML = `
            <a class="nav-link dropdown-toggle" href="#" id="userDropdownMenu" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-user"></i> ${userData.name || 'My Account'}
            </a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdownMenu">
                <li><a class="dropdown-item" href="/profile.html">My Profile</a></li>
                <li><a class="dropdown-item" href="/orders.html">My Orders</a></li>
                <li><a class="dropdown-item active" href="/wishlist.html">My Wishlist</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" id="logoutBtn">Logout</a></li>
            </ul>
        `;

        // Add logout functionality
        document.getElementById('logoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    } else {
        // User is not logged in
        userDropdown.innerHTML = `
            <a class="nav-link" href="/login.html?redirect=${encodeURIComponent(window.location.href)}">
                <i class="fas fa-user"></i> Login
            </a>
        `;
    }
}