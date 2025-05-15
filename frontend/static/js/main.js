// Global variables
let currentUser = null;
let cartItems = [];
let categories = [];

// DOM Ready event
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
});

// Application initialization
function initApp() {
    // Load user info
    loadUserInfo();

    // Load cart data
    loadCartData();

    // Load categories for navigation
    loadCategories();

    // Setup event listeners
    setupEventListeners();
}

// Load current user information
function loadUserInfo() {
    // Check if user is logged in by trying to get token from localStorage
    const token = localStorage.getItem('authToken');

    if (!token) {
        // User is not logged in
        updateUserDropdown(null);
        return;
    }

    // Fetch user data from API
    fetch('/api/users/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        return response.json();
    })
    .then(data => {
        currentUser = data;
        updateUserDropdown(currentUser);
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        // If there's an error (such as expired token), clear localStorage
        localStorage.removeItem('authToken');
        updateUserDropdown(null);
    });
}

// Update user dropdown based on login status
function updateUserDropdown(user) {
    const userDropdown = document.getElementById('userDropdown');

    if (!userDropdown) return;

    if (user) {
        // User is logged in
        userDropdown.innerHTML = `
            <button class="btn btn-outline-dark dropdown-toggle" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-user-circle"></i> ${user.firstName || 'User'}
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                <li><a class="dropdown-item" href="account.html"><i class="fas fa-user me-2"></i>My Account</a></li>
                <li><a class="dropdown-item" href="orders.html"><i class="fas fa-shopping-bag me-2"></i>My Orders</a></li>
                <li><a class="dropdown-item" href="wishlist.html"><i class="fas fa-heart me-2"></i>Wishlist</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
            </ul>
        `;

        // Add logout event listener
        document.getElementById('logoutBtn').addEventListener('click', logout);

        // If user is admin or seller, add dashboard link
        if (user.role === 'admin' || user.role === 'seller') {
            const dashboardLi = document.createElement('li');
            dashboardLi.innerHTML = `<a class="dropdown-item" href="${user.role === 'admin' ? 'admin' : 'seller'}/dashboard.html"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</a>`;
            userDropdown.querySelector('ul').insertBefore(dashboardLi, userDropdown.querySelector('ul').firstChild);
        }
    } else {
        // User is not logged in
        userDropdown.innerHTML = `
            <button class="btn btn-outline-dark dropdown-toggle" type="button" id="userMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-user-circle"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                <li><a class="dropdown-item" href="login.html"><i class="fas fa-sign-in-alt me-2"></i>Login</a></li>
                <li><a class="dropdown-item" href="register.html"><i class="fas fa-user-plus me-2"></i>Register</a></li>
            </ul>
        `;
    }
}

// Logout function
function logout(e) {
    e.preventDefault();

    // Clear local storage
    localStorage.removeItem('authToken');

    // Update UI
    currentUser = null;
    updateUserDropdown(null);

    // Redirect to home page
    window.location.href = '/';
}

// Load cart data
function loadCartData() {
    // Get cart from localStorage
    try {
        const cartData = localStorage.getItem('cartItems');
        if (cartData) {
            cartItems = JSON.parse(cartData);
            updateCartCount();
        }
    } catch (error) {
        console.error('Error loading cart data:', error);
        cartItems = [];
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
}

// Update cart count in the header
function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    const count = cartItems.reduce((total, item) => total + item.quantity, 0);

    cartCountElements.forEach(element => {
        element.textContent = count;
    });
}

// Load categories for navigation
function loadCategories() {
    fetch('/api/categories')
    .then(response => response.json())
    .then(data => {
        categories = data;
        updateCategoryMenu();
    })
    .catch(error => console.error('Error loading categories:', error));
}

// Update category dropdown menu
function updateCategoryMenu() {
    const categoryMenu = document.getElementById('categoryMenu');
    const categoryDropdown = document.getElementById('categoryDropdown');

    if (!categoryMenu) return;

    // Add "All Categories" option
    categoryMenu.innerHTML = `<li><a class="dropdown-item" href="/products?category=all">All Categories</a></li>`;

    // Add categories
    categories.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item" href="/products?category=${category.name.toLowerCase()}">${category.name}</a>`;
        categoryMenu.appendChild(li);
    });
}

// Setup global event listeners
function setupEventListeners() {
    // Search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            const query = searchInput.value.trim();

            if (query) {
                window.location.href = `/products?search=${encodeURIComponent(query)}`;
            }
        });
    }

    // Add to cart buttons (for pages that have them)
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.productId;
            const productName = productCard.querySelector('.card-title').textContent;
            const productPrice = parseFloat(productCard.querySelector('.price-value').dataset.price);
            const productImage = productCard.querySelector('img').src;

            addToCart(productId, productName, productPrice, productImage);
        });
    });
}

// Add item to cart
function addToCart(productId, name, price, image, quantity = 1, size = null, color = null) {
    // Check if item is already in cart
    const existingItemIndex = cartItems.findIndex(item =>
        item.productId === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItemIndex >= 0) {
        // Update quantity
        cartItems[existingItemIndex].quantity += quantity;
    } else {
        // Add new item
        cartItems.push({
            productId,
            name,
            price,
            image,
            quantity,
            size,
            color
        });
    }

    // Save to localStorage
    localStorage.setItem('cartItems', JSON.stringify(cartItems));

    // Update UI
    updateCartCount();

    // Show toast notification
    showToast('Product added to cart!');
}

// Show toast notification
function showToast(message) {
    // Create toast element if it doesn't exist
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '5';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    document.getElementById('toast-container').insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
}