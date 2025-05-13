document.addEventListener('DOMContentLoaded', () => {
    // Check for authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        // Redirect to orders page if no order ID
        window.location.href = '/account.html#orders';
        return;
    }

    // Initialize UI components
    initializeUI();

    // Load order details
    loadOrderDetails(orderId);

    // Logout buttons
    document.getElementById('logoutSidebarBtn').addEventListener('click', logout);
    if (document.getElementById('logoutLink')) {
        document.getElementById('logoutLink').addEventListener('click', logout);
    }

    // Reorder button
    document.getElementById('reorderBtn').addEventListener('click', () => reorder(orderId));
});

// Initialize UI components
function initializeUI() {
    // Load categories for dropdown
    loadCategories();

    // Update UI based on authentication
    updateUIForAuth();
}

// Load order details
async function loadOrderDetails(orderId) {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load order details');
        }

        const order = await response.json();
        displayOrderDetails(order);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error loading order details. Please try again.', 'danger');
    }
}

// Display order details
function displayOrderDetails(order) {
    // Basic order info
    document.getElementById('orderNumber').textContent = order.order_number || order.id;
    document.getElementById('orderDate').textContent = new Date(order.created_at).toLocaleString();
    document.getElementById('paymentMethod').textContent = order.payment_method || 'Not specified';

    // Order status
    const statusBadge = getStatusBadge(order.status);
    document.getElementById('orderStatus').innerHTML = statusBadge;
    document.getElementById('orderStatusBadge').outerHTML = statusBadge;

    // Order created date for timeline
    document.getElementById('orderCreatedDate').textContent = new Date(order.created_at).toLocaleString();

    // Shipping address
    const shipping = order.shipping_info;
    let addressHtml = '';
    if (shipping) {
        addressHtml = `
            <strong>${shipping.full_name}</strong><br>
            ${shipping.address || ''}<br>
            ${shipping.city || ''}, ${shipping.state || ''} ${shipping.postal_code || ''}<br>
            ${shipping.country || ''}<br>
            Phone: ${shipping.phone || 'Not provided'}
        `;
    } else {
        addressHtml = 'No shipping address provided';
    }
    document.getElementById('shippingAddress').innerHTML = addressHtml;

    // Order items
    const orderItemsElement = document.getElementById('orderItems');
    let orderItemsHtml = '';
    let subtotal = 0;

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            orderItemsHtml += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.image || '/static/images/product-placeholder.jpg'}" class="img-thumbnail me-2" style="width: 50px; height: 50px; object-fit: cover;" alt="${item.name}">
                            <div>
                                <p class="mb-0 fw-medium">${item.name}</p>
                                <small class="text-muted">Product ID: ${item.product_id}</small>
                            </div>
                        </div>
                    </td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>${item.quantity}</td>
                    <td>${item.size || 'N/A'}</td>
                    <td>${item.color || 'N/A'}</td>
                    <td>${formatCurrency(itemTotal)}</td>
                </tr>
            `;
        });
    } else {
        orderItemsHtml = `<tr><td colspan="6" class="text-center">No items found in this order</td></tr>`;
    }

    orderItemsElement.innerHTML = orderItemsHtml;

    // Order totals
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('shippingFee').textContent = formatCurrency(order.shipping_fee || 0);
    document.getElementById('discount').textContent = formatCurrency(order.discount || 0);
    document.getElementById('grandTotal').textContent = formatCurrency(order.total_amount);

    // Order timeline
    updateOrderTimeline(order);
}

// Update order timeline based on status
function updateOrderTimeline(order) {
    const timelineElement = document.getElementById('orderTimeline');
    let timelineHtml = '';

    // Always show order placed event
    const orderDate = new Date(order.created_at).toLocaleString();
    timelineHtml += `
        <li class="timeline-item mb-3">
            <div class="timeline-badge bg-primary"></div>
            <div class="timeline-content">
                <div class="d-flex justify-content-between">
                    <span class="fw-bold">Order Placed</span>
                    <span class="text-muted small">${orderDate}</span>
                </div>
                <p class="text-muted small mb-0">Your order has been placed successfully</p>
            </div>
        </li>
    `;

    // Add timeline items based on status
    const status = order.status.toLowerCase();

    if (status === 'processing' || status === 'shipped' || status === 'delivered') {
        const processingDate = order.processing_date ? new Date(order.processing_date).toLocaleString() : 'N/A';
        timelineHtml += `
            <li class="timeline-item mb-3">
                <div class="timeline-badge bg-info"></div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">Processing</span>
                        <span class="text-muted small">${processingDate}</span>
                    </div>
                    <p class="text-muted small mb-0">Your order is being processed</p>
                </div>
            </li>
        `;
    }

    if (status === 'shipped' || status === 'delivered') {
        const shippedDate = order.shipped_date ? new Date(order.shipped_date).toLocaleString() : 'N/A';
        timelineHtml += `
            <li class="timeline-item mb-3">
                <div class="timeline-badge bg-primary"></div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">Shipped</span>
                        <span class="text-muted small">${shippedDate}</span>
                    </div>
                    <p class="text-muted small mb-0">Your order has been shipped${order.tracking_number ? ' (Tracking #: ' + order.tracking_number + ')' : ''}</p>
                </div>
            </li>
        `;
    }

    if (status === 'delivered') {
        const deliveredDate = order.delivered_date ? new Date(order.delivered_date).toLocaleString() : 'N/A';
        timelineHtml += `
            <li class="timeline-item mb-3">
                <div class="timeline-badge bg-success"></div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">Delivered</span>
                        <span class="text-muted small">${deliveredDate}</span>
                    </div>
                    <p class="text-muted small mb-0">Your order has been delivered</p>
                </div>
            </li>
        `;
    }

    if (status === 'cancelled') {
        const cancelledDate = order.cancelled_date ? new Date(order.cancelled_date).toLocaleString() : 'N/A';
        timelineHtml += `
            <li class="timeline-item mb-3">
                <div class="timeline-badge bg-danger"></div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">Cancelled</span>
                        <span class="text-muted small">${cancelledDate}</span>
                    </div>
                    <p class="text-muted small mb-0">This order has been cancelled${order.cancellation_reason ? ': ' + order.cancellation_reason : ''}</p>
                </div>
            </li>
        `;
    }

    timelineElement.innerHTML = timelineHtml;
}

// Reorder function
async function reorder(orderId) {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`/api/orders/${orderId}/reorder`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to create new order');
        }

        const result = await response.json();
        showAlert('Items have been added to your cart', 'success');

        // Redirect to cart page
        setTimeout(() => {
            window.location.href = '/cart.html';
        }, 1500);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error recreating your order. Please try again.', 'danger');
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