document.addEventListener('DOMContentLoaded', () => {
    // Check for authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
        return;
    }

    // Initialize UI components
    initializeUI();

    // Load user profile
    loadUserProfile();

    // Load orders
    loadOrders();

    // Load wishlist
    loadWishlist();

    // Set up form event listeners
    setupFormListeners();

    // Handle tab navigation from URL hash
    handleTabNavigation();

    // Logout buttons
    document.getElementById('logoutSidebarBtn').addEventListener('click', logout);
    if (document.getElementById('logoutLink')) {
        document.getElementById('logoutLink').addEventListener('click', logout);
    }
});

// Initialize UI components
function initializeUI() {
    // Load categories for dropdown
    loadCategories();

    // Update UI based on authentication
    updateUIForAuth();
}

// Handle tab navigation from URL hash
function handleTabNavigation() {
    const hash = window.location.hash;
    if (hash) {
        const tabLink = document.querySelector(`a[href="${hash}"]`);
        if (tabLink) {
            tabLink.click();
        }
    }
}

// Load user profile
async function loadUserProfile() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load user profile');
        }

        const profile = await response.json();
        displayUserProfile(profile);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error loading profile information. Please try again.', 'danger');
    }
}

// Display user profile information
function displayUserProfile(profile) {
    // Update user name displays
    const userFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';
    document.getElementById('userFullName').textContent = userFullName;
    document.getElementById('userName').textContent = profile.username || userFullName;

    // Fill profile form
    document.getElementById('firstName').value = profile.first_name || '';
    document.getElementById('lastName').value = profile.last_name || '';
    document.getElementById('displayName').value = profile.username || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('phoneNumber').value = profile.phone || '';

    // Fill shipping address if available
    if (profile.shipping_address) {
        const shipping = profile.shipping_address;
        document.getElementById('shippingName').textContent = shipping.full_name || 'No name provided';
        document.getElementById('shippingAddress1').textContent = shipping.address || '';
        document.getElementById('shippingAddress2').textContent = shipping.address_2 || '';
        document.getElementById('shippingCity').textContent = shipping.city || '';
        document.getElementById('shippingState').textContent = shipping.state || '';
        document.getElementById('shippingPostal').textContent = shipping.postal_code || '';
        document.getElementById('shippingCountry').textContent = shipping.country || '';
        document.getElementById('shippingPhone').textContent = shipping.phone || '';

        // Pre-fill form values
        document.getElementById('shippingFullName').value = shipping.full_name || '';
        document.getElementById('shippingAddressLine1').value = shipping.address || '';
        document.getElementById('shippingAddressLine2').value = shipping.address_2 || '';
        document.getElementById('shippingCityInput').value = shipping.city || '';
        document.getElementById('shippingStateInput').value = shipping.state || '';
        document.getElementById('shippingPostalInput').value = shipping.postal_code || '';
        document.getElementById('shippingCountryInput').value = shipping.country || '';
        document.getElementById('shippingPhoneInput').value = shipping.phone || '';
    }

    // Fill billing address if available
    if (profile.billing_address) {
        const billing = profile.billing_address;
        document.getElementById('billingName').textContent = billing.full_name || 'No name provided';
        document.getElementById('billingAddress1').textContent = billing.address || '';
        document.getElementById('billingAddress2').textContent = billing.address_2 || '';
        document.getElementById('billingCity').textContent = billing.city || '';
        document.getElementById('billingState').textContent = billing.state || '';
        document.getElementById('billingPostal').textContent = billing.postal_code || '';
        document.getElementById('billingCountry').textContent = billing.country || '';
        document.getElementById('billingPhone').textContent = billing.phone || '';

        // Pre-fill form values
        document.getElementById('billingFullName').value = billing.full_name || '';
        document.getElementById('billingAddressLine1').value = billing.address || '';
        document.getElementById('billingAddressLine2').value = billing.address_2 || '';
        document.getElementById('billingCityInput').value = billing.city || '';
        document.getElementById('billingStateInput').value = billing.state || '';
        document.getElementById('billingPostalInput').value = billing.postal_code || '';
        document.getElementById('billingCountryInput').value = billing.country || '';
        document.getElementById('billingPhoneInput').value = billing.phone || '';
    }
}

// Load user orders
async function loadOrders() {
    const token = localStorage.getItem('accessToken');

    try {
                const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const orders = await response.json();
        displayOrders(orders);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('ordersList').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Failed to load orders. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Display user orders
function displayOrders(orders) {
    const ordersListElement = document.getElementById('ordersList');
    
    if (!orders || orders.length === 0) {
        ordersListElement.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <p class="mb-0">You haven't placed any orders yet.</p>
                    <a href="/" class="btn btn-sm btn-primary mt-2">Start Shopping</a>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort orders by date, newest first
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    let ordersHtml = '';
    
    orders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString();
        const statusBadge = getStatusBadge(order.status);
        
        ordersHtml += `
            <tr>
                <td>#${order.order_number || order.id}</td>
                <td>${orderDate}</td>
                <td>${statusBadge}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>
                    <a href="/order_detail.html?id=${order.id}" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-eye"></i> View
                    </a>
                </td>
            </tr>
        `;
    });
    
    ordersListElement.innerHTML = ordersHtml;
}

// Load wishlist items
async function loadWishlist() {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch('/api/wishlist', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load wishlist');
        }
        
        const wishlist = await response.json();
        displayWishlist(wishlist);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('wishlistItems').innerHTML = `
            <div class="col-12 text-center text-danger">
                Failed to load wishlist. Please try again later.
            </div>
        `;
    }
}

// Display wishlist items
function displayWishlist(wishlist) {
    const wishlistElement = document.getElementById('wishlistItems');
    
    if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
        wishlistElement.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-heart fa-3x mb-3 text-muted"></i>
                <p class="mb-3">Your wishlist is empty.</p>
                <a href="/" class="btn btn-primary">Browse Products</a>
            </div>
        `;
        return;
    }
    
    let wishlistHtml = '';
    
    wishlist.items.forEach(item => {
        const product = item.product;
        
        wishlistHtml += `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100">
                    <img src="${product.image || '/static/images/product-placeholder.jpg'}" class="card-img-top" alt="${product.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title mb-2">${product.name}</h6>
                        <p class="card-text mb-1 text-primary fw-bold">${formatCurrency(product.price)}</p>
                        <div class="mt-auto d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-danger remove-wishlist-btn" data-product-id="${product.id}">
                                <i class="fas fa-trash me-1"></i> Remove
                            </button>
                            <button class="btn btn-sm btn-primary add-to-cart-btn" data-product-id="${product.id}">
                                <i class="fas fa-shopping-cart me-1"></i> Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    wishlistElement.innerHTML = wishlistHtml;
    
    // Add event listeners for wishlist actions
    addWishlistEventListeners();
}

// Add event listeners for wishlist actions
function addWishlistEventListeners() {
    // Remove from wishlist
    document.querySelectorAll('.remove-wishlist-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.getAttribute('data-product-id');
            await removeFromWishlist(productId);
        });
    });
    
    // Add to cart from wishlist
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.getAttribute('data-product-id');
            await addToCartFromWishlist(productId);
        });
    });
}

// Remove product from wishlist
async function removeFromWishlist(productId) {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch(`/api/wishlist/item/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove from wishlist');
        }
        
        // Reload wishlist
        loadWishlist();
        
        // Show success message
        showAlert('Item removed from wishlist', 'success');
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to remove item from wishlist', 'danger');
    }
}

// Add wishlist item to cart
async function addToCartFromWishlist(productId) {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch('/api/cart/items', {
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
        showAlert('Item added to cart', 'success');
        
        // Update cart count
        updateCartCount();
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to add item to cart', 'danger');
    }
}

// Set up form event listeners
function setupFormListeners() {
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
    
    // Shipping address
    document.getElementById('editShippingBtn').addEventListener('click', () => {
        document.getElementById('shippingAddressDisplay').style.display = 'none';
        document.getElementById('shippingAddressForm').style.display = 'block';
    });
    
    document.getElementById('cancelShippingBtn').addEventListener('click', () => {
        document.getElementById('shippingAddressForm').style.display = 'none';
        document.getElementById('shippingAddressDisplay').style.display = 'block';
    });
    
    document.getElementById('shippingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateShippingAddress();
    });
    
    // Billing address
    document.getElementById('editBillingBtn').addEventListener('click', () => {
        document.getElementById('billingAddressDisplay').style.display = 'none';
        document.getElementById('billingAddressForm').style.display = 'block';
    });
    
    document.getElementById('cancelBillingBtn').addEventListener('click', () => {
        document.getElementById('billingAddressForm').style.display = 'none';
        document.getElementById('billingAddressDisplay').style.display = 'block';
    });
    
    document.getElementById('billingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateBillingAddress();
    });
    
    // Same as shipping checkbox
    document.getElementById('sameAsShipping').addEventListener('change', function() {
        if (this.checked) {
            // Copy shipping address to billing
            document.getElementById('billingFullName').value = document.getElementById('shippingFullName').value;
            document.getElementById('billingAddressLine1').value = document.getElementById('shippingAddressLine1').value;
            document.getElementById('billingAddressLine2').value = document.getElementById('shippingAddressLine2').value;
            document.getElementById('billingCityInput').value = document.getElementById('shippingCityInput').value;
            document.getElementById('billingStateInput').value = document.getElementById('shippingStateInput').value;
            document.getElementById('billingPostalInput').value = document.getElementById('shippingPostalInput').value;
            document.getElementById('billingCountryInput').value = document.getElementById('shippingCountryInput').value;
            document.getElementById('billingPhoneInput').value = document.getElementById('shippingPhoneInput').value;
        }
    });
}

// Update user profile
async function updateProfile() {
    const token = localStorage.getItem('accessToken');
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const displayName = document.getElementById('displayName').value;
    const email = document.getElementById('email').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validation
    if (!firstName || !lastName || !displayName || !email) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Password validation
    if (newPassword && newPassword !== confirmPassword) {
        showAlert('New passwords do not match', 'warning');
        return;
    }
    
    // Prepare profile data
    const profileData = {
        first_name: firstName,
        last_name: lastName,
        username: displayName,
        email: email,
        phone: phoneNumber
    };
    
    // Add password data if a new password is set
    if (newPassword) {
        profileData.current_password = currentPassword;
        profileData.new_password = newPassword;
    }
    
    try {
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update profile');
        }
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Show success message
        showAlert('Profile updated successfully', 'success');
        
        // Reload user profile
        loadUserProfile();
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || 'Failed to update profile', 'danger');
    }
}

// Update shipping address
async function updateShippingAddress() {
    const token = localStorage.getItem('accessToken');
    
    const shippingAddress = {
        full_name: document.getElementById('shippingFullName').value,
        address: document.getElementById('shippingAddressLine1').value,
        address_2: document.getElementById('shippingAddressLine2').value,
        city: document.getElementById('shippingCityInput').value,
        state: document.getElementById('shippingStateInput').value,
        postal_code: document.getElementById('shippingPostalInput').value,
        country: document.getElementById('shippingCountryInput').value,
        phone: document.getElementById('shippingPhoneInput').value
    };
    
    try {
        const response = await fetch('/api/users/address/shipping', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(shippingAddress)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update shipping address');
        }
        
        // Hide form and show updated address
        document.getElementById('shippingAddressForm').style.display = 'none';
        document.getElementById('shippingAddressDisplay').style.display = 'block';
        
        // Show success message
        showAlert('Shipping address updated successfully', 'success');
        
        // Reload user profile
        loadUserProfile();
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to update shipping address', 'danger');
    }
}

// Update billing address
async function updateBillingAddress() {
    const token = localStorage.getItem('accessToken');
    
    const billingAddress = {
        full_name: document.getElementById('billingFullName').value,
        address: document.getElementById('billingAddressLine1').value,
        address_2: document.getElementById('billingAddressLine2').value,
        city: document.getElementById('billingCityInput').value,
        state: document.getElementById('billingStateInput').value,
        postal_code: document.getElementById('billingPostalInput').value,
        country: document.getElementById('billingCountryInput').value,
        phone: document.getElementById('billingPhoneInput').value
    };
    
    try {
        const response = await fetch('/api/users/address/billing', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(billingAddress)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update billing address');
        }
        
        // Hide form and show updated address
        document.getElementById('billingAddressForm').style.display = 'none';
        document.getElementById('billingAddressDisplay').style.display = 'block';
        
        // Show success message
        showAlert('Billing address updated successfully', 'success');
        
        // Reload user profile
        loadUserProfile();
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to update billing address', 'danger');
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    const statusLower = status.toLowerCase();
    let badgeClass = 'bg-secondary';
    
    if (statusLower === 'pending') badgeClass = 'bg-warning text-dark';
    else if (statusLower === 'processing') badgeClass = 'bg-info';
    else if (statusLower === 'shipped') badgeClass = 'bg-primary';
    else if (statusLower === 'delivered') badgeClass = 'bg-success';
    else if (statusLower === 'cancelled') badgeClass = 'bg-danger';
    
    return `<span class="badge ${badgeClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertContainer.style.top = '20px';
    alertContainer.style.right = '20px';
    alertContainer.style.zIndex = '9999';
    
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertContainer);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = bootstrap.Alert.getOrCreateInstance(alertContainer);
        alert.close();
    }, 5000);
}

// Logout function
function logout() {
    localStorage.removeItem('accessToken');
    window.location.href = '/login.html';
}