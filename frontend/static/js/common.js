// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Function to format date
function formatDate(dateString) {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// Helper function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Helper function to format payment method for display
function formatPaymentMethod(method) {
    if (method === "credit_card") {
        return "Credit/Debit Card";
    } else if (method === "bank_transfer") {
        return "Bank Transfer";
    } else if (method === "cod") {
        return "Cash on Delivery";
    }
    return method || "N/A";
}

// Helper function to format shipping method for display
function formatShippingMethod(method) {
    if (method === "express") {
        return "Express Shipping (1-2 business days)";
    } else {
        return "Standard Shipping (3-5 business days)";
    }
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case "pending":
            return "bg-warning";
        case "processing":
            return "bg-info";
        case "shipped":
            return "bg-primary";
        case "delivered":
            return "bg-success";
        case "cancelled":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
}

// Function to check authentication and update UI
async function checkAuthAndUpdateUI() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            return null;
        }

        const response = await fetch("/api/users/me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();

            // Load categories
            loadCategories();

            // Update user dropdown in the header
            const userDropdown = document.getElementById("userDropdown");
            userDropdown.innerHTML = `
                <a class="nav-link dropdown-toggle" href="#" id="userDropdownMenu" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user"></i> ${user.username}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdownMenu">
                    <li><a class="dropdown-item" href="${window.location.pathname.includes('/admin/') || window.location.pathname.includes('/seller/') ? '/' : ''}profile.html">My Profile</a></li>
                    <li><a class="dropdown-item" href="${window.location.pathname.includes('/admin/') || window.location.pathname.includes('/seller/') ? '/' : ''}orders.html">My Orders</a></li>
                    ${user.role === "admin" ? '<li><a class="dropdown-item" href="/admin/dashboard.html">Admin Dashboard</a></li>' : ''}
                    ${user.role === "seller" ? '<li><a class="dropdown-item" href="/seller/dashboard.html">Seller Dashboard</a></li>' : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                </ul>
            `;

            // Add logout event listener
            document.getElementById("logoutBtn").addEventListener("click", logout);

            // Update cart count if element exists
            if (document.getElementById("cartCount")) {
                fetchCartCount();
            }

            return user;
        } else {
            localStorage.removeItem("token");
            return null;
        }
    } catch (error) {
        console.error("Error checking authentication:", error);
        return null;
    }
}

// Function to load categories
async function loadCategories() {
    try {
        const response = await fetch("/api/categories");
        if (response.ok) {
            const categories = await response.json();

            const categoryMenu = document.getElementById("categoryMenu");
            if (categoryMenu) {
                categoryMenu.innerHTML = "";

                categories.forEach(category => {
                    categoryMenu.innerHTML += `
                        <li><a class="dropdown-item" href="${window.location.pathname.includes('/admin/') || window.location.pathname.includes('/seller/') ? '/' : ''}products.html?category=${encodeURIComponent(category.name)}">${category.name}</a></li>
                    `;
                });
            }
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Function to update cart count badge
async function fetchCartCount() {
    try {
        const response = await fetch("/api/cart", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            const cartData = await response.json();
            const cartCountElement = document.getElementById("cartCount");
            if (cartCountElement) {
                cartCountElement.textContent = cartData.items.length;
            }
        }
    } catch (error) {
        console.error("Error fetching cart count:", error);
    }
}

// Function to logout
function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
}
// Initialize common elements across all pages
function initCommonElements() {
    // Setup user dropdown
    setupUserDropdown();

    // Setup navigation
    loadCategories();

    // Setup search form
    setupSearchForm();

    // Load cart count
    updateCartCount();
}

// Setup user dropdown based on authentication status
function setupUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (!userDropdown) return;

    if (isLoggedIn()) {
        const userData = getUserData();

        if (userData) {
            // Create dropdown for logged in user
            userDropdown.innerHTML = `
                <a class="nav-link dropdown-toggle" href="#" id="userMenuButton" role="button"
                    data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-user-circle"></i> ${userData.name || userData.email}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                    <li><a class="dropdown-item" href="profile.html">My Profile</a></li>
                    <li><a class="dropdown-item" href="profile.html#orders">My Orders</a></li>
                    ${userData.role === 'seller' ? '<li><a class="dropdown-item" href="seller/dashboard.html">Seller Dashboard</a></li>' : ''}
                    ${userData.role === 'admin' ? '<li><a class="dropdown-item" href="admin/dashboard.html">Admin Dashboard</a></li>' : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                </ul>
            `;

            // Add logout event listener
            document.getElementById('logoutBtn').addEventListener('click', logout);
        }
    } else {
        // Create login/register links
        userDropdown.innerHTML = `
            <a class="nav-link" href="login.html">
                <i class="fas fa-user"></i> Login
            </a>
        `;
    }
}

// Load categories for navigation
async function loadCategories() {
    const categoryMenu = document.getElementById('categoryMenu');
    const categoryDropdown = document.getElementById('categoryDropdown');

    if (!categoryMenu && !categoryDropdown) return;

    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }

        const categories = await response.json();

        // Update category menu or dropdown
        if (categoryMenu) {
            categoryMenu.innerHTML = `<li><a class="dropdown-item" href="products.html">All Products</a></li>`;

            categories.forEach(category => {
                categoryMenu.innerHTML += `
                    <li><a class="dropdown-item" href="products.html?category=${encodeURIComponent(category.name.toLowerCase())}">${category.name}</a></li>
                `;
            });
        }

        if (categoryDropdown) {
            categoryDropdown.innerHTML = `<li><a class="dropdown-item" href="products.html">All Products</a></li>`;

            categories.forEach(category => {
                categoryDropdown.innerHTML += `
                    <li><a class="dropdown-item" href="products.html?category=${encodeURIComponent(category.name.toLowerCase())}">${category.name}</a></li>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Setup search form
function setupSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (!searchForm) return;

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const searchInput = document.getElementById('searchInput');
        const searchQuery = searchInput.value.trim();

        if (searchQuery) {
            window.location.href = `products.html?search=${encodeURIComponent(searchQuery)}`;
        }
    });
}

// Update cart count
async function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    if (cartCountElements.length === 0) return;

    if (!isLoggedIn()) {
        cartCountElements.forEach(el => el.textContent = '0');
        return;
    }

    try {
        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cart');
        }

        const cart = await response.json();
        const itemCount = cart.items ? cart.items.length : 0;

        cartCountElements.forEach(el => el.textContent = itemCount);
    } catch (error) {
        console.error('Error updating cart count:', error);
        cartCountElements.forEach(el => el.textContent = '0');
    }
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Get user data from localStorage
function getUserData() {
    const userDataStr = localStorage.getItem('userData');
    if (!userDataStr) return null;

    try {
        return JSON.parse(userDataStr);
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Logout function
function logout() {
    // Clear user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userData');

    // Redirect to homepage
    window.location.href = 'index.html';
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    // Create unique ID for this toast
    const toastId = 'toast-' + Date.now();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Add toast to container
    toastContainer.appendChild(toast);

    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();

    // Remove toast from DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}