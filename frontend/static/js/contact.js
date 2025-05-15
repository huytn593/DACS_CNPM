document.addEventListener('DOMContentLoaded', function() {
    // Initialize page elements
    const contactForm = document.getElementById('contactForm');
    const categoryMenu = document.getElementById('categoryMenu');

    // Load user data and update UI
    updateUserUI();

    // Load categories in the dropdown menu
    loadCategories();

    // Update cart count
    updateCartCount();

    // Set up contact form submission
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }

    // Set up search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchQuery = document.getElementById('searchInput').value.trim();
            if (searchQuery) {
                window.location.href = `/products.html?search=${encodeURIComponent(searchQuery)}`;
            }
        });
    }
});

/**
 * Handle contact form submission
 */
async function handleContactFormSubmit(e) {
    e.preventDefault();

    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();

    // Basic validation
    if (!name || !email || !subject || !message) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Show loading state
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';

    try {
        // Send the contact form data to the API
        const response = await fetch('/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                subject,
                message
            })
        });

        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        // Show success message
        showToast('Your message has been sent successfully! We will get back to you soon.', 'success');

        // Reset the form
        contactForm.reset();

    } catch (error) {
        console.error('Error sending contact form:', error);
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;

        // Show error message
        showToast('Failed to send your message. Please try again later.', 'error');
    }
}

/**
 * Load categories for the header dropdown
 */
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }

        const categories = await response.json();
        const categoryMenu = document.getElementById('categoryMenu');

        if (categoryMenu) {
            // Clear existing categories
            categoryMenu.innerHTML = '';

            // Add "All Categories" option
            const allCategoriesItem = document.createElement('li');
            allCategoriesItem.innerHTML = `<a class="dropdown-item" href="/products.html">All Categories</a>`;
            categoryMenu.appendChild(allCategoriesItem);

            // Add divider
            const divider = document.createElement('li');
            divider.innerHTML = `<hr class="dropdown-divider">`;
            categoryMenu.appendChild(divider);

            // Add each category to the menu
            categories.forEach(category => {
                const li = document.createElement('li');
                li.innerHTML = `<a class="dropdown-item" href="/products.html?category=${encodeURIComponent(category.name)}">${category.name}</a>`;
                categoryMenu.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * Update the user UI elements in the header
 */
function updateUserUI() {
    const token = localStorage.getItem('token');
    const userDropdown = document.getElementById('userDropdown');

    if (userDropdown) {
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
                    <li><a class="dropdown-item" href="/wishlist.html">My Wishlist</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" id="logoutBtn">Logout</a></li>
                </ul>
            `;

            // Add logout functionality
            document.getElementById('logoutBtn').addEventListener('click', function(e) {
                e.preventDefault();
                logout();
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
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

/**
 * Update cart count in header
 */
async function updateCartCount() {
    try {
        const token = localStorage.getItem('token');
        const cartCountElement = document.getElementById('cartCount');

        if (!cartCountElement) return;

        if (!token) {
            cartCountElement.textContent = '0';
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
        cartCountElement.textContent = data.count;
    } catch (error) {
        console.error('Error updating cart count:', error);
        const cartCountElement = document.getElementById('cartCount');
        if (cartCountElement) {
            cartCountElement.textContent = '0';
        }
    }
}

/**
 * Show toast notification
 */
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
    toast.className = `toast ${type === 'error' ? 'bg-danger text-white' : 'bg-success text-white'}`;
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
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}