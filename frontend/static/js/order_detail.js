// static/js/order-detail.js

let currentOrderId = null;
const cancelOrderModal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));

document.addEventListener("DOMContentLoaded", function() {
    // Check if user is authenticated
    checkAuthAndUpdateUI().then(user => {
        if (!user) {
            // Redirect to login page if not authenticated
            window.location.href = "/login.html?redirect=order-detail.html" + window.location.search;
            return;
        }

        // Get order ID from URL
        const orderId = getUrlParameter("id");
        if (!orderId) {
            // No order ID provided, show error
            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderNotFound').style.display = 'block';
            return;
        }

        // Load order details
        loadOrderDetail(orderId);
    });

    // Initialize event listeners
    document.getElementById('confirmCancelBtn').addEventListener('click', function() {
        const reason = document.getElementById('cancelReason').value.trim();
        cancelOrder(currentOrderId, reason);
    });
});

// Function to load order detail
async function loadOrderDetail(orderId) {
    try {
        currentOrderId = orderId;

        // Show loading
        document.getElementById('orderLoading').style.display = 'block';
        document.getElementById('orderDetails').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'none';

        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const order = await response.json();

            // Update page title
            document.title = `Order #${order.id.substring(order.id.length - 8)} - Fashion Store`;

            // Populate order details
            document.getElementById('orderId').textContent = order.id;
            document.getElementById('orderDate').textContent = formatDate(order.created_at);
            document.getElementById('paymentMethod').textContent = formatPaymentMethod(order.payment_method);
            document.getElementById('shippingMethod').textContent = formatShippingMethod(order.shipping_method);

            // Populate shipping information
            document.getElementById('shippingName').textContent = order.shipping_info.name;
            document.getElementById('shippingPhone').textContent = order.shipping_info.phone;
            document.getElementById('shippingAddress').textContent = order.shipping_info.address;
            document.getElementById('shippingCity').textContent = order.shipping_info.city;
            document.getElementById('shippingDistrict').textContent = order.shipping_info.district;

            // Update order status
            const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            document.getElementById('orderStatusBadge').textContent = statusText;
            document.getElementById('orderStatusBadge').className = `badge status-badge ${getStatusBadgeClass(order.status)}`;

            // Update order notes if any
            if (order.notes) {
                document.getElementById('orderNotesCard').style.display = 'block';
                document.getElementById('orderNotes').textContent = order.notes;
            } else {
                document.getElementById('orderNotesCard').style.display = 'none';
            }

            // Populate order items
            const orderItemsContainer = document.getElementById('orderItems');
            orderItemsContainer.innerHTML = '';

            order.items.forEach(item => {
                const itemTotal = item.price * item.quantity;

                orderItemsContainer.innerHTML += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${item.image_url || '/static/img/default-product.jpg'}" 
                                    alt="${item.product_name}" class="me-2" 
                                    style="width: 40px; height: 40px; object-fit: cover;">
                                <div>
                                    <div>${item.product_name}</div>
                                    <div class="small text-muted">
                                        ${item.size ? `Size: ${item.size}` : ""}
                                        ${item.color ? `Color: ${item.color}` : ""}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>${formatCurrency(item.price)}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">${formatCurrency(itemTotal)}</td>
                    </tr>
                `;
            });

            // Populate order totals
            document.getElementById('orderSubtotal').textContent = formatCurrency(order.subtotal_amount);
            document.getElementById('orderShippingFee').textContent = formatCurrency(order.shipping_fee);
            document.getElementById('orderTotal').textContent = formatCurrency(order.total_amount);

            // Update order timeline
            updateOrderTimeline(order);

            // Update cancel order section
            updateCancelOrderSection(order);

            // Show order details
            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderDetails').style.display = 'block';
        } else {
            // Order not found or no permission
            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderNotFound').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
        document.getElementById('orderLoading').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'block';
    }
}

// Function to update order timeline
function updateOrderTimeline(order) {
    // Reset timeline badges
    document.querySelectorAll('.timeline-badge').forEach(badge => {
        badge.classList.remove('active', 'completed');
    });

    // Set timeline dates
    document.getElementById('timelinePlacedDate').textContent = formatDate(order.created_at);
    document.getElementById('timelineProcessingDate').textContent = order.processing_date ? formatDate(order.processing_date) : '-';
    document.getElementById('timelineShippedDate').textContent = order.shipped_date ? formatDate(order.shipped_date) : '-';
    document.getElementById('timelineDeliveredDate').textContent = order.delivered_date ? formatDate(order.delivered_date) : '-';

    // Hide cancel timeline by default
    document.getElementById('cancelTimeline').style.display = 'none';

    // Update timeline based on status
    if (order.status === 'cancelled') {
        // Show cancel timeline
        document.getElementById('cancelTimeline').style.display = 'block';
        document.getElementById('timelineCancelledDate').textContent = order.cancelled_date ? formatDate(order.cancelled_date) : formatDate(order.updated_at);
        document.getElementById('cancellationReason').textContent = order.cancellation_reason || 'No reason provided';

        // Add completed class to placed badge
        document.getElementById('timelinePlaced').classList.add('completed');
    } else {
        // Update timeline badges based on status
        document.getElementById('timelinePlaced').classList.add('completed');

        if (order.status === 'pending') {
            // Only order placed is completed
        } else if (order.status === 'processing') {
            document.getElementById('timelineProcessing').classList.add('active');
        } else if (order.status === 'shipped') {
            document.getElementById('timelineProcessing').classList.add('completed');
            document.getElementById('timelineShipped').classList.add('active');
        } else if (order.status === 'delivered') {
            document.getElementById('timelineProcessing').classList.add('completed');
            document.getElementById('timelineShipped').classList.add('completed');
            document.getElementById('timelineDelivered').classList.add('completed');
        }
    }
}

// Function to update cancel order section
function updateCancelOrderSection(order) {
    const cancelOrderSection = document.getElementById('cancelOrderSection');
    cancelOrderSection.innerHTML = '';

    // Only show cancel button if order is pending or processing
    if (order.status === 'pending' || order.status === 'processing') {
        cancelOrderSection.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <button class="btn btn-danger btn-block w-100" id="cancelOrderBtn">
                        <i class="fas fa-times-circle me-2"></i> Cancel Order
                    </button>
                    <p class="text-muted small mt-2 mb-0">
                        You can cancel this order while it's still "${order.status}".
                        Orders cannot be cancelled once they are shipped.
                    </p>
                </div>
            </div>
        `;

        // Add event listener to cancel button
        document.getElementById('cancelOrderBtn').addEventListener('click', function() {
            // Clear previous reason
            document.getElementById('cancelReason').value = '';

            // Open cancel modal
            cancelOrderModal.show();
        });
    }
}

// Function to cancel order
async function cancelOrder(orderId, reason) {
    try {
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const originalText = cancelBtn.textContent;

        // Show loading state
        cancelBtn.disabled = true;
        cancelBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cancelling...';

        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                reason: reason
            })
        });

        if (response.ok) {
            // Close the cancel modal
            cancelOrderModal.hide();

            // Reload order details
            await loadOrderDetail(orderId);

            // Show success message
            alert('Order cancelled successfully');
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to cancel order');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('An error occurred while cancelling the order');
    } finally {
        // Reset button state
        const cancelBtn = document.getElementById('confirmCancelBtn');
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Yes, Cancel Order';
    }
}

// Helper function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Function to format date
function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '-';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Function to format payment method
function formatPaymentMethod(method) {
    if (method === 'cod') return 'Cash On Delivery';
    if (method === 'bank_transfer') return 'Bank Transfer';
    if (method === 'credit_card') return 'Credit Card';
    if (method === 'momo') return 'MoMo';
    return method;
}

// Function to format shipping method
function formatShippingMethod(method) {
    if (method === 'standard') return 'Standard (2-5 business days)';
    if (method === 'express') return 'Express (1-2 business days)';
    return method;
}

// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Function to get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending':
            return 'bg-warning text-dark';
        case 'processing':
            return 'bg-info text-white';
        case 'shipped':
            return 'bg-primary text-white';
        case 'delivered':
            return 'bg-success text-white';
        case 'cancelled':
            return 'bg-danger text-white';
        default:
            return 'bg-secondary text-white';
    }
}

// Function to check authentication and update UI
async function checkAuthAndUpdateUI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return null;
        }

        const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();

            // Update user dropdown
            document.getElementById('userDropdown').innerHTML = `
                <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user"></i> ${user.name || user.email}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="profile.html">My Profile</a></li>
                    <li><a class="dropdown-item" href="orders.html">My Orders</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                </ul>
            `;

            // Add logout event listener
            document.getElementById('logoutBtn').addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('token');
                window.location.href = '/';
            });

            return user;
        } else {
            localStorage.removeItem('token');
            return null;
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        return null;
    }
}

// Add event listener to fetch categories on page load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('/api/categories');
        if (response.ok) {
            const categories = await response.json();

            // Populate category dropdown menu
            const categoryMenu = document.getElementById('categoryMenu');
            categoryMenu.innerHTML = '';

            categories.forEach(category => {
                categoryMenu.innerHTML += `
                    <li><a class="dropdown-item" href="products.html?category=${encodeURIComponent(category.name)}">${category.name}</a></li>
                `;
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }

    // Load cart count
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const cart = await response.json();

                // Update cart count
                let totalItems = 0;
                cart.items.forEach(item => {
                    totalItems += item.quantity;
                });

                document.getElementById('cartCount').textContent = totalItems;
            }
        }
    } catch (error) {
        console.error('Error loading cart count:', error);
    }
});
// Function to handle navigation back to orders page
function navigateToOrders() {
    window.location.href = '/orders.html';
}

// Function to retry loading order if failed
function retryOrderLoad() {
    const orderId = getUrlParameter("id");
    if (orderId) {
        loadOrderDetail(orderId);
    } else {
        document.getElementById('orderLoading').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'block';
    }
}

// Function to share order link
function shareOrder() {
    // Create a temporary input to copy the URL
    const tempInput = document.createElement("input");
    tempInput.value = window.location.href;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    // Show success message
    const shareBtn = document.getElementById('shareOrderBtn');
    const originalText = shareBtn.innerHTML;
    shareBtn.innerHTML = '<i class="fas fa-check me-2"></i>Link Copied!';

    // Reset button after 2 seconds
    setTimeout(() => {
        shareBtn.innerHTML = originalText;
    }, 2000);
}

// Function to validate reason length for order cancellation
function validateCancelReason() {
    const reasonInput = document.getElementById('cancelReason');
    const confirmBtn = document.getElementById('confirmCancelBtn');
    const charCounter = document.getElementById('reasonCharCounter');

    const maxLength = 200;
    const currentLength = reasonInput.value.length;
    const remaining = maxLength - currentLength;

    // Update character counter
    charCounter.textContent = `${currentLength}/${maxLength}`;

    // Disable button if reason is too long
    if (currentLength > maxLength) {
        confirmBtn.disabled = true;
        charCounter.classList.add('text-danger');
    } else {
        confirmBtn.disabled = false;
        charCounter.classList.remove('text-danger');
    }
}

// Event listener initialization for the cancel order modal
function initializeCancelModal() {
    // Add character counter to cancel reason input
    const cancelReason = document.getElementById('cancelReason');

    if (cancelReason) {
        // Add character counter div if not exists
        if (!document.getElementById('reasonCharCounter')) {
            const charCounter = document.createElement('div');
            charCounter.id = 'reasonCharCounter';
            charCounter.className = 'text-muted small mt-1';
            charCounter.textContent = '0/200';
            cancelReason.parentNode.appendChild(charCounter);
        }

        // Add input event listener for character counting
        cancelReason.addEventListener('input', validateCancelReason);

        // Add modal shown event listener to focus on textarea
        const cancelOrderModal = document.getElementById('cancelOrderModal');
        if (cancelOrderModal) {
            cancelOrderModal.addEventListener('shown.bs.modal', function() {
                cancelReason.focus();
                validateCancelReason();
            });
        }
    }
}

// Handle printing order receipt
function printOrderReceipt() {
    window.print();
}

// Prepare order data for download as JSON
function downloadOrderData() {
    const orderId = getUrlParameter("id");

    // Get the order data from the page elements
    const orderData = {
        id: document.getElementById('orderId').textContent,
        date: document.getElementById('orderDate').textContent,
        status: document.getElementById('orderStatusBadge').textContent,
        customer: {
            name: document.getElementById('shippingName').textContent,
            phone: document.getElementById('shippingPhone').textContent,
            address: document.getElementById('shippingAddress').textContent,
            city: document.getElementById('shippingCity').textContent,
            district: document.getElementById('shippingDistrict').textContent
        },
        payment_method: document.getElementById('paymentMethod').textContent,
        shipping_method: document.getElementById('shippingMethod').textContent,
        subtotal: document.getElementById('orderSubtotal').textContent,
        shipping_fee: document.getElementById('orderShippingFee').textContent,
        total: document.getElementById('orderTotal').textContent
    };

    // Convert to JSON string with pretty formatting
    const jsonData = JSON.stringify(orderData, null, 2);

    // Create blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `order-${orderId.substring(orderId.length - 8)}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }, 100);
}

// Initialize page event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cancel modal
    initializeCancelModal();

    // Add event listeners for action buttons
    const printButton = document.getElementById('printOrderBtn');
    if (printButton) {
        printButton.addEventListener('click', printOrderReceipt);
    }

    const downloadButton = document.getElementById('downloadOrderBtn');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadOrderData);
    }

    const shareButton = document.getElementById('shareOrderBtn');
    if (shareButton) {
        shareButton.addEventListener('click', shareOrder);
    }

    const backButton = document.getElementById('backToOrdersBtn');
    if (backButton) {
        backButton.addEventListener('click', navigateToOrders);
    }

    const retryButton = document.getElementById('retryOrderBtn');
    if (retryButton) {
        retryButton.addEventListener('click', retryOrderLoad);
    }

    // For demo purposes - add simulated status change buttons
    const simulateStatusButtons = document.querySelectorAll('.simulate-status-btn');
    simulateStatusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            if (status && currentOrderId) {
                simulateStatusChange(currentOrderId, status);
            }
        });
    });
});

// Function to simulate order status change (for demo/testing)
async function simulateStatusChange(orderId, status) {
    // This function is for demo purposes only
    // In a real application, this would be handled by admin controls
    try {
        if (!confirm(`Simulate changing order status to ${status}?`)) {
            return;
        }

        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                status: status
            })
        });

        if (response.ok) {
            // Reload order details
            loadOrderDetail(orderId);
        } else {
            const error = await response.json();
            alert(error.detail || 'Status change failed');
        }
    } catch (error) {
        console.error('Error changing status:', error);
        alert('An error occurred while changing order status');
    }
}

// Function to handle order reorder (create new order with same items)
async function reorderItems() {
    try {
        const orderId = currentOrderId;
        if (!orderId) return;

        // Show loading
        const reorderBtn = document.getElementById('reorderBtn');
        const originalText = reorderBtn.innerHTML;
        reorderBtn.disabled = true;
        reorderBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';

        // Get order details
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const order = await response.json();

            // Add each item to cart
            let addedItems = 0;
            for (const item of order.items) {
                try {
                    const itemResponse = await fetch('/api/cart/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            product_id: item.product_id,
                            quantity: item.quantity,
                            size: item.size,
                            color: item.color
                        })
                    });

                    if (itemResponse.ok) {
                        addedItems++;
                    }
                } catch (error) {
                    console.error('Error adding item to cart:', error);
                }
            }

            // Redirect to cart page
            if (addedItems > 0) {
                window.location.href = '/cart.html';
            } else {
                alert('Failed to add items to cart. Items may be out of stock.');
            }
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to reorder');
        }
    } catch (error) {
        console.error('Error reordering:', error);
        alert('An error occurred while reordering');
    } finally {
        // Reset button
        const reorderBtn = document.getElementById('reorderBtn');
        if (reorderBtn) {
            reorderBtn.disabled = false;
            reorderBtn.innerHTML = '<i class="fas fa-shopping-cart me-2"></i>Reorder Items';
        }
    }
}

// Initialize reorder button if present
const reorderBtn = document.getElementById('reorderBtn');
if (reorderBtn) {
    reorderBtn.addEventListener('click', reorderItems);
}

// Add tracking number display and notification features
function updateTrackingInformation(order) {
    const trackingSection = document.getElementById('trackingSection');
    if (!trackingSection) return;

    // Clear existing content
    trackingSection.innerHTML = '';

    // Only show tracking information if order is shipped
    if (order.status === 'shipped' || order.status === 'delivered') {
        // Check if tracking number exists
        const trackingNumber = order.tracking_number || generateMockTrackingNumber(order.id);

        trackingSection.innerHTML = `
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-truck me-2"></i> Shipping Information</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">Tracking Number:</div>
                        <div class="col-md-8">
                            <span class="tracking-code">${trackingNumber}</span>
                            <button class="btn btn-sm btn-outline-secondary ms-2" onclick="copyTrackingNumber('${trackingNumber}')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">Shipping Carrier:</div>
                        <div class="col-md-8">${order.shipping_carrier || 'Giao Hàng Nhanh'}</div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 fw-bold">Estimated Delivery:</div>
                        <div class="col-md-8">
                            ${getEstimatedDelivery(order.shipped_date, order.shipping_method)}
                        </div>
                    </div>
                    <div class="mt-3">
                        <a href="#" class="btn btn-outline-primary btn-sm" 
                           onclick="openTrackingModal('${trackingNumber}', '${order.shipping_carrier || 'Giao Hàng Nhanh'}')">
                            <i class="fas fa-search-location me-2"></i> Track Package
                        </a>
                        <button class="btn btn-outline-secondary btn-sm ms-2" id="notifyDeliveryBtn">
                            <i class="fas fa-bell me-2"></i> Notify on Delivery
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add notification event listener
        document.getElementById('notifyDeliveryBtn').addEventListener('click', function() {
            setupDeliveryNotification(order.id, trackingNumber);
        });
    }
}

// Copy tracking number to clipboard
function copyTrackingNumber(trackingNumber) {
    navigator.clipboard.writeText(trackingNumber).then(() => {
        showToast('Tracking number copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// Generate mock tracking number based on order ID
function generateMockTrackingNumber(orderId) {
    // Create a consistent tracking number using the order ID
    const baseId = orderId.slice(-8).toUpperCase();
    return `GHN${baseId}VN`;
}

// Calculate estimated delivery dates
function getEstimatedDelivery(shippedDate, shippingMethod) {
    if (!shippedDate) return 'Pending';

    const shipped = new Date(shippedDate);
    let deliveryDays = shippingMethod === 'express' ? 2 : 5;

    // Add business days (skip weekends)
    const estimatedDate = new Date(shipped);
    let addedDays = 0;
    while (addedDays < deliveryDays) {
        estimatedDate.setDate(estimatedDate.getDate() + 1);
        // Skip weekends
        if (estimatedDate.getDay() !== 0 && estimatedDate.getDay() !== 6) {
            addedDays++;
        }
    }

    return formatDateFull(estimatedDate);
}

// Format date with full month name
function formatDateFull(date) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('en-US', options);
}

// Show a toast notification
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
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
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Toast content
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                    data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast, {
        animation: true,
        autohide: true,
        delay: 3000
    });
    bsToast.show();

    // Remove toast after hiding
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Setup delivery notification (simulated)
function setupDeliveryNotification(orderId, trackingNumber) {
    if (!('Notification' in window)) {
        alert('This browser does not support desktop notifications');
        return;
    }

    // Check permission and request if needed
    if (Notification.permission === 'granted') {
        registerForNotification(orderId, trackingNumber);
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                registerForNotification(orderId, trackingNumber);
            }
        });
    }
}

// Register for delivery notification (simulated)
function registerForNotification(orderId, trackingNumber) {
    // In a real application, this would connect to a backend service for push notifications
    showToast('You will be notified when your order is delivered!');

    // Store notification preference in localStorage for demo
    const notifications = JSON.parse(localStorage.getItem('deliveryNotifications') || '{}');
    notifications[orderId] = {
        trackingNumber,
        registered: new Date().toISOString()
    };
    localStorage.setItem('deliveryNotifications', JSON.stringify(notifications));

    // Change button state
    const notifyBtn = document.getElementById('notifyDeliveryBtn');
    notifyBtn.innerHTML = '<i class="fas fa-bell-slash me-2"></i> Cancel Notification';
    notifyBtn.classList.replace('btn-outline-secondary', 'btn-outline-danger');

    // Update event listener
    notifyBtn.removeEventListener('click', notifyBtn.clickEvent);
    notifyBtn.clickEvent = function() {
        cancelNotification(orderId);
    };
    notifyBtn.addEventListener('click', notifyBtn.clickEvent);
}

// Cancel delivery notification
function cancelNotification(orderId) {
    const notifications = JSON.parse(localStorage.getItem('deliveryNotifications') || '{}');
    delete notifications[orderId];
    localStorage.setItem('deliveryNotifications', JSON.stringify(notifications));

    // Change button state back
    const notifyBtn = document.getElementById('notifyDeliveryBtn');
    notifyBtn.innerHTML = '<i class="fas fa-bell me-2"></i> Notify on Delivery';
    notifyBtn.classList.replace('btn-outline-danger', 'btn-outline-secondary');

    // Update event listener
    notifyBtn.removeEventListener('click', notifyBtn.clickEvent);
    notifyBtn.clickEvent = function() {
        setupDeliveryNotification(orderId, document.querySelector('.tracking-code').textContent);
    };
    notifyBtn.addEventListener('click', notifyBtn.clickEvent);

    showToast('Delivery notification canceled', 'info');
}

// Open tracking modal (simulated)
function openTrackingModal(trackingNumber, carrier) {
    // Create modal if it doesn't exist
    let trackingModal = document.getElementById('trackingModal');
    if (!trackingModal) {
        const modalElement = document.createElement('div');
        modalElement.className = 'modal fade';
        modalElement.id = 'trackingModal';
        modalElement.tabIndex = '-1';
        modalElement.setAttribute('aria-labelledby', 'trackingModalLabel');
        modalElement.setAttribute('aria-hidden', 'true');

        modalElement.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="trackingModalLabel">Package Tracking</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="trackingModalBody">
                        <div class="d-flex justify-content-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalElement);
        trackingModal = new bootstrap.Modal(document.getElementById('trackingModal'));
    } else {
        trackingModal = bootstrap.Modal.getInstance(document.getElementById('trackingModal')) ||
                       new bootstrap.Modal(document.getElementById('trackingModal'));
    }

    // Show the modal
    trackingModal.show();

    // Simulate loading tracking information
    setTimeout(() => {
        const modalBody = document.getElementById('trackingModalBody');

        // Generate simulated tracking data
        const shipDate = new Date();
        shipDate.setDate(shipDate.getDate() - Math.floor(Math.random() * 5));

        const events = [
            {
                date: new Date(shipDate),
                status: 'Package shipped',
                location: 'HCM Distribution Center'
            }
        ];

        // Add random events
        const eventTypes = [
            {status: 'In transit', location: 'HCM Sort Facility'},
            {status: 'Out for delivery', location: 'Local Delivery Center'},
            {status: 'Arrived at sorting facility', location: 'Regional Distribution Center'},
            {status: 'Processed through facility', location: 'Provincial Hub'}
        ];

        const numEvents = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numEvents; i++) {
            const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const eventDate = new Date(shipDate);
            eventDate.setHours(eventDate.getHours() + (i + 1) * 12);

            events.push({
                date: eventDate,
                status: event.status,
                location: event.location
            });
        }

        // Sort events by date (newest first)
        events.sort((a, b) => b.date - a.date);

        // Update modal with tracking info
        modalBody.innerHTML = `
            <div class="tracking-info mb-4">
                <div class="row mb-3">
                    <div class="col-md-4 fw-bold">Tracking Number:</div>
                    <div class="col-md-8">${trackingNumber}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-4 fw-bold">Carrier:</div>
                    <div class="col-md-8">${carrier}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-4 fw-bold">Status:</div>
                    <div class="col-md-8">
                        <span class="badge bg-primary">${events[0].status}</span>
                    </div>
                </div>
            </div>
            
            <h6 class="border-bottom pb-2 mb-3">Tracking History</h6>
            <div class="tracking-timeline">
                <ul class="list-group list-group-flush">
                    ${events.map(event => `
                        <li class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="fw-bold">${event.status}</div>
                                    <div class="text-muted">${event.location}</div>
                                </div>
                                <div class="text-end text-muted small">
                                    ${formatDate(event.date)}
                                </div>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }, 1500);
}

// Add a review for products in delivered orders
function showReviewForm(productId, productName) {
    // Create modal if it doesn't exist
    let reviewModal = document.getElementById('reviewModal');
    if (!reviewModal) {
        const modalElement = document.createElement('div');
        modalElement.className = 'modal fade';
        modalElement.id = 'reviewModal';
        modalElement.tabIndex = '-1';
        modalElement.setAttribute('aria-labelledby', 'reviewModalLabel');
        modalElement.setAttribute('aria-hidden', 'true');

        modalElement.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="reviewModalLabel">Write a Review</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="reviewForm">
                            <input type="hidden" id="reviewProductId">
                            <div class="mb-3">
                                <label class="form-label">Product</label>
                                <div id="reviewProductName" class="form-control-plaintext"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Rating</label>
                                <div class="rating-stars">
                                    <span class="star" data-value="1"><i class="far fa-star"></i></span>
                                    <span class="star" data-value="2"><i class="far fa-star"></i></span>
                                    <span class="star" data-value="3"><i class="far fa-star"></i></span>
                                    <span class="star" data-value="4"><i class="far fa-star"></i></span>
                                    <span class="star" data-value="5"><i class="far fa-star"></i></span>
                                </div>
                                <input type="hidden" id="reviewRating" value="0" required>
                            </div>
                            <div class="mb-3">
                                <label for="reviewText" class="form-label">Your Review</label>
                                <textarea class="form-control" id="reviewText" rows="4" required></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitReviewBtn">Submit Review</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalElement);
        reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'));

        // Add star rating functionality
        document.querySelectorAll('.rating-stars .star').forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.getAttribute('data-value'));
                document.getElementById('reviewRating').value = value;

                // Update star UI
                document.querySelectorAll('.rating-stars .star').forEach((s, index) => {
                    const starIcon = s.querySelector('i');
                    if (index < value) {
                        starIcon.className = 'fas fa-star text-warning';
                    } else {
                        starIcon.className = 'far fa-star';
                    }
                });
            });
        });

        // Add submit handler
        document.getElementById('submitReviewBtn').addEventListener('click', submitProductReview);
    } else {
        reviewModal = bootstrap.Modal.getInstance(document.getElementById('reviewModal')) ||
                     new bootstrap.Modal(document.getElementById('reviewModal'));
    }

    // Set product details
    document.getElementById('reviewProductId').value = productId;
    document.getElementById('reviewProductName').textContent = productName;

    // Reset form
    document.getElementById('reviewRating').value = 0;
    document.getElementById('reviewText').value = '';
    document.querySelectorAll('.rating-stars .star i').forEach(star => {
        star.className = 'far fa-star';
    });

    // Show the modal
    reviewModal.show();
}

// Submit a product review
async function submitProductReview() {
    const productId = document.getElementById('reviewProductId').value;
    const rating = parseInt(document.getElementById('reviewRating').value);
    const text = document.getElementById('reviewText').value.trim();

    // Validate form
    if (!rating) {
        showToast('Please select a rating', 'danger');
        return;
    }

    if (!text) {
        showToast('Please write a review', 'danger');
        return;
    }

    try {
        const submitBtn = document.getElementById('submitReviewBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting...';

        // Call API to submit review
        const response = await fetch(`/api/products/${productId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                rating,
                text
            })
        });

        if (response.ok) {
            showToast('Review submitted successfully', 'success');

            // Close modal
            const reviewModal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
            reviewModal.hide();
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to submit review', 'danger');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('An error occurred while submitting your review', 'danger');
    } finally {
        // Reset button
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
}

// Update order items section for delivered orders
function updateOrderItems(order) {
    const orderItemsContainer = document.getElementById('orderItems');
    orderItemsContainer.innerHTML = '';

    order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;

        // Basic row structure
        let rowHtml = `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${item.image_url || '/static/img/default-product.jpg'}" 
                            alt="${item.product_name}" class="me-2" 
                            style="width: 40px; height: 40px; object-fit: cover;">
                        <div>
                            <div>${item.product_name}</div>
                            <div class="small text-muted">
                                ${item.size ? `Size: ${item.size}` : ""}
                                ${item.color ? `Color: ${item.color}` : ""}
                            </div>
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(item.price)}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${formatCurrency(itemTotal)}</td>
            </tr>
        `;

        // Add extra row for delivered orders to add review button
        if (order.status === 'delivered') {
            rowHtml += `
                <tr class="border-0">
                    <td colspan="4" class="border-0 pt-0">
                        <div class="d-flex justify-content-end">
                            <button class="btn btn-sm btn-outline-primary review-btn" 
                                    onclick="showReviewForm('${item.product_id}', '${item.product_name.replace(/'/g, "\\'")}')">
                                <i class="fas fa-star me-1"></i> Write a Review
                            </button>
                            <a href="/product.html?id=${item.product_id}" class="btn btn-sm btn-outline-secondary ms-2">
                                <i class="fas fa-shopping-cart me-1"></i> Buy Again
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }

        orderItemsContainer.innerHTML += rowHtml;
    });
}

// Add these modifications to the loadOrderDetail function
async function loadOrderDetail(orderId) {
    try {
        currentOrderId = orderId;

        // Show loading
        document.getElementById('orderLoading').style.display = 'block';
        document.getElementById('orderDetails').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'none';

        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const order = await response.json();

            // Update page title
            document.title = `Order #${order.id.substring(order.id.length - 8)} - Fashion Store`;

            // Populate order details
            // ... [existing code]

            // Update order items with the new function
            updateOrderItems(order);

            // Update order timeline
            updateOrderTimeline(order);

            // Update cancel order section
            updateCancelOrderSection(order);

            // Update tracking information (new function)
            updateTrackingInformation(order);

            // Check for delivery notification preference
            checkNotificationStatus(order.id);

            // Show order details
            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderDetails').style.display = 'block';
        } else {
            // Order not found or no permission
            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderNotFound').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
        document.getElementById('orderLoading').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'block';
    }
}

// Check notification status
function checkNotificationStatus(orderId) {
    const notifications = JSON.parse(localStorage.getItem('deliveryNotifications') || '{}');

    if (notifications[orderId]) {
        // User has already registered for notifications
        const notifyBtn = document.getElementById('notifyDeliveryBtn');
        if (notifyBtn) {
            notifyBtn.innerHTML = '<i class="fas fa-bell-slash me-2"></i> Cancel Notification';
            notifyBtn.classList.replace('btn-outline-secondary', 'btn-outline-danger');

            // Update event listener
            notifyBtn.removeEventListener('click', notifyBtn.clickEvent);
            notifyBtn.clickEvent = function() {
                cancelNotification(orderId);
            };
            notifyBtn.addEventListener('click', notifyBtn.clickEvent);
        }
    }
}

// Order timeline visualization
function updateOrderTimeline(order) {
    const timelineContainer = document.getElementById('orderTimeline');
    if (!timelineContainer) return;

    // Clear existing content
    timelineContainer.innerHTML = '';

    // Define all possible steps in an order timeline
    const steps = [
        {
            status: 'pending',
            label: 'Order Placed',
            icon: 'fa-shopping-cart',
            date: order.created_at,
            color: 'primary'
        },
        {
            status: 'processing',
            label: 'Processing',
            icon: 'fa-cogs',
            date: order.processing_date,
            color: 'info'
        },
        {
            status: 'shipped',
            label: 'Shipped',
            icon: 'fa-truck',
            date: order.shipped_date,
            color: 'info'
        },
        {
            status: 'delivered',
            label: 'Delivered',
            icon: 'fa-check-circle',
            date: order.delivered_date,
            color: 'success'
        }
    ];

    // If order is cancelled, handle special case
    if (order.status === 'cancelled') {
        steps.push({
            status: 'cancelled',
            label: 'Cancelled',
            icon: 'fa-times-circle',
            date: order.cancelled_date,
            color: 'danger'
        });
    }

    // Find current step index
    let currentStepIndex = steps.findIndex(step => step.status === order.status);
    if (currentStepIndex === -1) {
        // If not found (pending is default), find the highest step that has a date
        for (let i = steps.length - 1; i >= 0; i--) {
            if (steps[i].date) {
                currentStepIndex = i;
                break;
            }
        }
    }

    // Create timeline HTML
    let timelineHtml = '<div class="order-timeline">';

    steps.forEach((step, index) => {
        // Skip cancelled if order is not cancelled
        if (step.status === 'cancelled' && order.status !== 'cancelled') {
            return;
        }

        // Skip delivered if order is cancelled
        if (step.status === 'delivered' && order.status === 'cancelled') {
            return;
        }

        const isActive = index <= currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const statusClass = isActive ? `text-${step.color}` : 'text-muted';
        const iconClass = isActive ? `bg-${step.color} text-white` : 'bg-light text-muted';
        const lineClass = isActive ? `border-${step.color}` : '';

        timelineHtml += `
            <div class="timeline-item ${isCurrent ? 'current' : ''}">
                <div class="timeline-icon ${iconClass}">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="timeline-content">
                    <h5 class="${statusClass}">${step.label}</h5>
                    <p class="small text-muted mb-0">
                        ${step.date ? formatDate(step.date) : 'Pending'}
                    </p>
                    ${isCurrent && step.status === 'cancelled' && order.cancellation_reason ? 
                      `<div class="mt-2 text-danger small">Reason: ${order.cancellation_reason}</div>` : ''}
                </div>
                ${index < steps.length - 1 ? `<div class="timeline-line ${lineClass}"></div>` : ''}
            </div>
        `;
    });

    timelineHtml += '</div>';
    timelineContainer.innerHTML = timelineHtml;
}

// Function to handle order cancellation
function updateCancelOrderSection(order) {
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    if (!cancelOrderBtn) return;

    // Only show cancel button for orders that are pending or processing
    if (order.status === 'pending' || order.status === 'processing') {
        cancelOrderBtn.style.display = 'block';

        // Add event listener if not already added
        if (!cancelOrderBtn.hasAttribute('data-listener-added')) {
            cancelOrderBtn.addEventListener('click', function() {
                // Show cancel order modal
                const cancelModal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));
                cancelModal.show();
            });
            cancelOrderBtn.setAttribute('data-listener-added', 'true');
        }

        // Add confirm cancel button event listener
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');
        if (confirmCancelBtn && !confirmCancelBtn.hasAttribute('data-listener-added')) {
            confirmCancelBtn.addEventListener('click', function() {
                cancelOrder(order.id);
            });
            confirmCancelBtn.setAttribute('data-listener-added', 'true');
        }
    } else {
        cancelOrderBtn.style.display = 'none';
    }
}

// Function to cancel an order
async function cancelOrder(orderId) {
    try {
        const cancelReason = document.getElementById('cancelReason').value.trim();

        // Show loading state
        const confirmBtn = document.getElementById('confirmCancelBtn');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cancelling...';

        // Call API to cancel order
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                reason: cancelReason
            })
        });

        if (response.ok) {
            // Hide modal
            const cancelModal = bootstrap.Modal.getInstance(document.getElementById('cancelOrderModal'));
            cancelModal.hide();

            // Show success message
            showToast('Order cancelled successfully', 'success');

            // Reload order details
            loadOrderDetail(orderId);
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to cancel order', 'danger');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('An error occurred while cancelling order', 'danger');
    } finally {
        // Reset button
        const confirmBtn = document.getElementById('confirmCancelBtn');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Confirm Cancellation';
    }
}

// Function to generate invoice PDF
async function generateInvoicePDF() {
    try {
        const orderId = currentOrderId;
        if (!orderId) return;

        // Get order details
        const order = await getCurrentOrderDetails();
        if (!order) {
            showToast('Could not generate invoice: order details not available', 'danger');
            return;
        }

        // Show loading state
        const invoiceBtn = document.getElementById('downloadInvoiceBtn');
        if (invoiceBtn) {
            const originalText = invoiceBtn.innerHTML;
            invoiceBtn.disabled = true;
            invoiceBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating...';

            // Use setTimeout to allow UI to update
            setTimeout(() => {
                try {
                    // Generate PDF using html2pdf or similar library
                    generatePDF(order);

                    // Reset button
                    invoiceBtn.disabled = false;
                    invoiceBtn.innerHTML = originalText;
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    showToast('Failed to generate invoice PDF', 'danger');

                    // Reset button
                    invoiceBtn.disabled = false;
                    invoiceBtn.innerHTML = originalText;
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error generating invoice:', error);
        showToast('An error occurred while generating invoice', 'danger');
    }
}

// Get current order details from DOM for PDF generation
function getCurrentOrderDetails() {
    try {
        // Get basic order info
        const orderId = document.getElementById('orderId').textContent;
        const orderDate = document.getElementById('orderDate').textContent;
        const orderStatus = document.getElementById('orderStatusBadge').textContent;

        // Get shipping info
        const shippingName = document.getElementById('shippingName').textContent;
        const shippingPhone = document.getElementById('shippingPhone').textContent;
        const shippingAddress = document.getElementById('shippingAddress').textContent;
        const shippingCity = document.getElementById('shippingCity').textContent;
        const shippingDistrict = document.getElementById('shippingDistrict').textContent;

        // Get payment info
        const paymentMethod = document.getElementById('paymentMethod').textContent;
        const shippingMethod = document.getElementById('shippingMethod').textContent;

        // Get order items
        const items = [];
        const rows = document.querySelectorAll('#orderItems tr');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Skip action rows (review buttons)
            if (!row.querySelector('td:nth-child(2)')) continue;

            const productName = row.querySelector('td:first-child div div:first-child').textContent;
            const price = row.querySelector('td:nth-child(2)').textContent;
            const quantity = row.querySelector('td:nth-child(3)').textContent;
            const total = row.querySelector('td:nth-child(4)').textContent;

            // Get additional info
            let size = '';
            let color = '';
            const additionalInfo = row.querySelector('td:first-child div div.small');
            if (additionalInfo) {
                const infoText = additionalInfo.textContent;
                if (infoText.includes('Size:')) {
                    size = infoText.match(/Size: ([^,]+)/)?.[1] || '';
                }
                if (infoText.includes('Color:')) {
                    color = infoText.match(/Color: ([^,]+)/)?.[1] || '';
                }
            }

            items.push({
                product_name: productName,
                price: price,
                quantity: quantity,
                total: total,
                size: size,
                color: color
            });
        }

        // Get totals
        const subtotal = document.getElementById('orderSubtotal').textContent;
        const shippingFee = document.getElementById('orderShippingFee').textContent;
        const total = document.getElementById('orderTotal').textContent;

        return {
            id: orderId,
            date: orderDate,
            status: orderStatus,
            shipping_info: {
                name: shippingName,
                phone: shippingPhone,
                address: shippingAddress,
                city: shippingCity,
                district: shippingDistrict
            },
            payment_method: paymentMethod,
            shipping_method: shippingMethod,
            items: items,
            subtotal: subtotal,
            shipping_fee: shippingFee,
            total: total
        };
    } catch (error) {
        console.error('Error getting order details:', error);
        return null;
    }
}

// Generate PDF with invoice
function generatePDF(order) {
    // Create invoice HTML template
    const invoiceHtml = `
        <div id="invoice" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; color: #333;">INVOICE</h2>
                    <p style="margin: 5px 0 0; color: #666;">Order #${order.id}</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0; color: #333;">Fashion Store</h3>
                    <p style="margin: 5px 0 0; color: #666;">123 Fashion St., Ho Chi Minh City</p>
                    <p style="margin: 5px 0 0; color: #666;">contact@fashionstore.com</p>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div style="width: 48%;">
                    <h4 style="margin: 0 0 10px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Bill To:</h4>
                    <p style="margin: 5px 0; color: #333;"><strong>${order.shipping_info.name}</strong></p>
                    <p style="margin: 5px 0; color: #666;">${order.shipping_info.address}</p>
                    <p style="margin: 5px 0; color: #666;">${order.shipping_info.district}, ${order.shipping_info.city}</p>
                    <p style="margin: 5px 0; color: #666;">Phone: ${order.shipping_info.phone}</p>
                </div>
                <div style="width: 48%;">
                    <h4 style="margin: 0 0 10px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Invoice Details:</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 5px 0; color: #666;">Invoice Date:</td>
                            <td style="padding: 5px 0; color: #333; text-align: right;">${order.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #666;">Payment Method:</td>
                            <td style="padding: 5px 0; color: #333; text-align: right;">${order.payment_method}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #666;">Shipping Method:</td>
                            <td style="padding: 5px 0; color: #333; text-align: right;">${order.shipping_method}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #666;">Order Status:</td>
                            <td style="padding: 5px 0; color: #333; text-align: right;">${order.status}</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <div style="font-weight: bold;">${item.product_name}</div>
                                ${item.size || item.color ? `
                                    <div style="font-size: 12px; color: #666;">
                                        ${item.size ? `Size: ${item.size}` : ''}
                                        ${item.color ? `Color: ${item.color}` : ''}
                                    </div>
                                ` : ''}
                            </td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.price}</td>
                            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.total}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="display: flex; justify-content: flex-end;">
                <table style="width: 300px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Subtotal:</td>
                        <td style="padding: 5px 0; color: #333; text-align: right;">${order.subtotal}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Shipping Fee:</td>
                        <td style="padding: 5px 0; color: #333; text-align: right;">${order.shipping_fee}</td>
                    </tr>
                    <tr style="font-weight: bold;">
                        <td style="padding: 10px 0 5px; border-top: 2px solid #eee;">Total:</td>
                        <td style="padding: 10px 0 5px; border-top: 2px solid #eee; text-align: right;">${order.total}</td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
                <p style="margin: 0;">Thank you for shopping with Fashion Store!</p>
                <p style="margin: 5px 0 0;">If you have any questions, please contact our customer support at support@fashionstore.com</p>
            </div>
        </div>
    `;

    // Create a temporary container for the invoice
    const container = document.createElement('div');
    container.innerHTML = invoiceHtml;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // Generate PDF using html2pdf
    const invoiceElement = container.querySelector('#invoice');
    const options = {
        margin: 10,
        filename: `invoice-${order.id.substring(order.id.length - 8)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generate and download PDF
    html2pdf().set(options).from(invoiceElement).save().then(() => {
        // Remove temporary container
        document.body.removeChild(container);

        // Show success message
        showToast('Invoice generated successfully', 'success');
    });
}

// Add download invoice button event listener
document.addEventListener('DOMContentLoaded', function() {
    const downloadInvoiceBtn = document.getElementById('downloadInvoiceBtn');
    if (downloadInvoiceBtn) {
        downloadInvoiceBtn.addEventListener('click', generateInvoicePDF);
    }

    // Include needed external libraries for PDF generation
    loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
});

// Helper function to load external scripts
function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Add helpful utilities
const formatCurrency = (amount) => {
    // Format as Vietnamese Dong (VND)
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
};

// Format date with time
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Add smooth scrolling to elements
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 70, // Adjust for header
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Add CSS for timeline
function addTimelineStyles() {
    if (document.getElementById('timeline-styles')) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'timeline-styles';
    styleElement.textContent = `
        .order-timeline {
            position: relative;
            padding: 20px 0;
        }
        
        .timeline-item {
            display: flex;
            position: relative;
            padding-bottom: 30px;
        }
        
        .timeline-item:last-child {
            padding-bottom: 0;
        }
        
        .timeline-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            z-index: 2;
        }
        
        .timeline-content {
            flex: 1;
        }
        
        .timeline-line {
            position: absolute;
            top: 40px;
            left: 20px;
            bottom: 0;
            width: 2px;
            background-color: #e9ecef;
            z-index: 1;
        }
        
        .timeline-line.border-primary {
            background-color: var(--bs-primary);
        }
        
        .timeline-line.border-info {
            background-color: var(--bs-info);
        }
        
        .timeline-line.border-success {
            background-color: var(--bs-success);
        }
        
        .timeline-line.border-danger {
            background-color: var(--bs-danger);
        }
        
        .timeline-item.current .timeline-content {
            font-weight: bold;
        }
        
        /* For print styles */
        @media print {
            .order-timeline {
                break-inside: avoid;
            }
            
            .btn, .nav, .footer, #cancelOrderBtn, #shareOrderBtn, #printOrderBtn,
            #downloadOrderBtn, #downloadInvoiceBtn, #retryOrderBtn, #backToOrdersBtn {
                display: none !important;
            }
            
            .container {
                max-width: 100%;
                width: 100%;
            }
            
            body {
                font-size: 12pt;
            }
            
            .card {
                border: 1px solid #ddd;
                box-shadow: none;
            }
        }
    `;

    document.head.appendChild(styleElement);
}

// Initialize function to set up everything
document.addEventListener('DOMContentLoaded', function() {
    // Add timeline styles
    addTimelineStyles();

    // Set up smooth scrolling
    setupSmoothScroll();

    // Load order if ID is in URL
    const orderId = getUrlParameter("id");
    if (orderId) {
        loadOrderDetail(orderId);
    } else {
        document.getElementById('orderLoading').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'block';
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Add timeline styles
    addTimelineStyles();

    // Load order if ID is in URL
    const orderId = getUrlParameter("id");
    if (orderId) {
        loadOrderDetail(orderId);
    } else {
        document.getElementById('orderLoading').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'block';
    }

    // Setup download invoice button
    document.getElementById('downloadInvoiceBtn').addEventListener('click', function() {
        // Simple alert for now - this would be replaced with actual PDF generation
        alert('Invoice download functionality will be implemented soon.');
    });
});

// Add CSS for timeline
function addTimelineStyles() {
    if (!document.getElementById('timeline-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'timeline-styles';
        styleElement.textContent = `
            .timeline {
                position: relative;
                padding-left: 30px;
            }
            
            .timeline-item {
                position: relative;
                margin-bottom: 30px;
            }
            
            .timeline-item:last-child {
                margin-bottom: 0;
            }
            
            .timeline:before {
                content: '';
                position: absolute;
                left: 10px;
                top: 0;
                bottom: 0;
                width: 2px;
                background-color: #e9ecef;
            }
            
            .timeline-badge {
                position: absolute;
                left: -30px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                text-align: center;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
            }
            
            .timeline-content {
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 0.25rem;
            }
        `;
        document.head.appendChild(styleElement);
    }
}

// Load order details
async function loadOrderDetail(orderId) {
    try {
        // Show loading
        document.getElementById('orderLoading').style.display = 'block';
        document.getElementById('orderDetails').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'none';

        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const order = await response.json();

            // Update page title with short order ID
            const shortOrderId = order.id.substring(order.id.length - 8);
            document.title = `Order #${shortOrderId} - Fashion Store`;

            // Populate order details
            document.getElementById('orderId').textContent = shortOrderId;
            document.getElementById('orderDate').textContent = formatDate(order.created_at);

            // Update order status with appropriate badge color
            const statusBadge = document.getElementById('orderStatus');
            const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            let badgeClass = 'bg-secondary';

            switch (order.status) {
                case 'pending': badgeClass = 'bg-warning text-dark'; break;
                case 'processing': badgeClass = 'bg-info text-white'; break;
                case 'shipped': badgeClass = 'bg-primary'; break;
                case 'delivered': badgeClass = 'bg-success'; break;
                case 'cancelled': badgeClass = 'bg-danger'; break;
            }

            statusBadge.className = `badge ${badgeClass}`;
            statusBadge.textContent = statusText;

            // Populate shipping info
            const shippingAddressEl = document.getElementById('shippingAddress');
            shippingAddressEl.innerHTML = `
                ${order.shipping_info.name}<br>
                ${order.shipping_info.phone}<br>
                ${order.shipping_info.address}<br>
                ${order.shipping_info.district}, ${order.shipping_info.city}
            `;

            // Use the same shipping address for billing if not provided separately
            const billingAddressEl = document.getElementById('billingAddress');
            billingAddressEl.innerHTML = shippingAddressEl.innerHTML;

            // Populate payment info
            const paymentMethodEl = document.getElementById('paymentMethod');
            const paymentMethods = {
                'cod': 'Cash on Delivery',
                'bank_transfer': 'Bank Transfer',
                'credit_card': 'Credit Card',
                'momo': 'MoMo Wallet',
                'zalopay': 'ZaloPay'
            };
            paymentMethodEl.textContent = paymentMethods[order.payment_method] || order.payment_method;

            // Update order items
            updateOrderItems(order);

            // Update order timeline
            updateOrderTimeline(order);

            // Show order details
            document.getElementById('orderDetails').style.display = 'block';

            // Show Cancel Order button if status is pending or processing
            const cancelOrderBtn = document.getElementById('cancelOrderBtn');
            if (cancelOrderBtn) {
                if (order.status === 'pending' || order.status === 'processing') {
                    cancelOrderBtn.style.display = 'block';
                    cancelOrderBtn.addEventListener('click', () => showCancelConfirmation(orderId));
                } else {
                    cancelOrderBtn.style.display = 'none';
                }
            }
        } else {
            // Order not found or access denied
            document.getElementById('orderLoading').style.display = 'none';
            document.getElementById('orderNotFound').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        document.getElementById('orderLoading').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'block';
    }
}

// Update order items in the table
function updateOrderItems(order) {
    const orderItemsContainer = document.getElementById('orderItems');
    if (!orderItemsContainer) return;

    // Clear previous items
    orderItemsContainer.innerHTML = '';

    // Add each item to the table
    order.items.forEach(item => {
        orderItemsContainer.innerHTML += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        ${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}" class="me-3" style="width: 50px; height: 50px; object-fit: cover;">` : ''}
                        <div>
                            <h6 class="mb-0">${item.product_name}</h6>
                            ${item.size ? `<small class="text-muted">Size: ${item.size}</small>` : ''}
                            ${item.color ? `<small class="text-muted d-block">Color: ${item.color}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(item.price)}</td>
                <td>${item.quantity}</td>
                <td class="text-end">${formatCurrency(item.price * item.quantity)}</td>
            </tr>
        `;
    });

    // Update order totals
    document.getElementById('subtotal').textContent = formatCurrency(order.subtotal_amount);
    document.getElementById('shipping').textContent = formatCurrency(order.shipping_fee);

    // Check if discount exists and update
    const discountElement = document.getElementById('discount');
    if (discountElement) {
        if (order.discount_amount && order.discount_amount > 0) {
            discountElement.textContent = `-${formatCurrency(order.discount_amount)}`;
            discountElement.closest('tr').style.display = '';
        } else {
            discountElement.closest('tr').style.display = 'none';
        }
    }

    // Update total
    document.getElementById('total').textContent = formatCurrency(order.total_amount);
}

// Update order timeline
function updateOrderTimeline(order) {
    const timelineContainer = document.getElementById('orderTimeline');
    if (!timelineContainer) return;

    // Clear existing timeline
    timelineContainer.innerHTML = '';

    // Define timeline events based on order status and dates
    const timelineEvents = [];

    // Always add the order placed event
    timelineEvents.push({
        status: 'placed',
        label: 'Order Placed',
        date: order.created_at,
        icon: 'shopping-cart',
        description: 'Your order has been placed successfully.',
        badgeClass: 'bg-dark'
    });

    // Add payment confirmed if payment is not COD
    if (order.payment_method !== 'cod') {
        timelineEvents.push({
            status: 'payment',
            label: 'Payment Confirmed',
            date: order.created_at,
            icon: 'credit-card',
            description: 'Your payment has been confirmed.',
            badgeClass: 'bg-secondary'
        });
    }

    // Add processing if applicable
    if (order.status !== 'pending' && order.status !== 'cancelled') {
        timelineEvents.push({
            status: 'processing',
            label: 'Order Processing',
            date: order.processing_date || null,
            icon: 'box',
            description: 'Your order is being processed and packed.',
            badgeClass: 'bg-info'
        });
    }

    // Add shipped if applicable
    if (order.status === 'shipped' || order.status === 'delivered') {
        timelineEvents.push({
            status: 'shipped',
            label: 'Order Shipped',
            date: order.shipped_date || null,
            icon: 'truck',
            description: order.tracking_number
                ? `Your order has been shipped. Tracking number: ${order.tracking_number}`
                : 'Your order has been shipped.',
            badgeClass: 'bg-primary'
        });
    }

    // Add delivered if applicable
    if (order.status === 'delivered') {
        timelineEvents.push({
            status: 'delivered',
            label: 'Order Delivered',
            date: order.delivered_date || null,
            icon: 'check',
            description: 'Your order has been delivered successfully.',
            badgeClass: 'bg-success'
        });
    }

    // Add cancelled if applicable
    if (order.status === 'cancelled') {
        timelineEvents.push({
            status: 'cancelled',
            label: 'Order Cancelled',
            date: order.cancelled_date || null,
            icon: 'times',
            description: order.cancellation_reason
                ? `Your order has been cancelled. Reason: ${order.cancellation_reason}`
                : 'Your order has been cancelled.',
            badgeClass: 'bg-danger'
        });
    }

    // Sort events by date (if available)
    timelineEvents.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
    });

    // Build the timeline HTML
    timelineEvents.forEach(event => {
        if (!event.date && event.status !== 'placed') {
            // Skip events without dates (except for order placed)
            return;
        }

        const formattedDate = event.date ? formatDate(event.date) : '';

        timelineContainer.innerHTML += `
            <div class="timeline-item">
                <div class="timeline-badge ${event.badgeClass}">
                    <i class="fas fa-${event.icon}"></i>
                </div>
                <div class="timeline-content">
                    <h6>${event.label}</h6>
                    <p class="text-muted">${formattedDate}</p>
                    <p>${event.description}</p>
                </div>
            </div>
        `;
    });
}

// Show cancel order confirmation
function showCancelConfirmation(orderId) {
    // Create modal if it doesn't exist
    if (!document.getElementById('cancelOrderModal')) {
        const modalHtml = `
            <div class="modal fade" id="cancelOrderModal" tabindex="-1" aria-labelledby="cancelOrderModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="cancelOrderModalLabel">Cancel Order</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to cancel this order?</p>
                            <div class="mb-3">
                                <label for="cancelReason" class="form-label">Reason (optional):</label>
                                <textarea class="form-control" id="cancelReason" rows="3"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-danger" id="confirmCancelBtn">Cancel Order</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listener to the confirm button
        document.getElementById('confirmCancelBtn').addEventListener('click', async () => {
            const reason = document.getElementById('cancelReason').value;
            await cancelOrder(orderId, reason);
            const modal = bootstrap.Modal.getInstance(document.getElementById('cancelOrderModal'));
            modal.hide();
        });
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));
    modal.show();
}

// Cancel order
async function cancelOrder(orderId, reason) {
    try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ reason: reason })
        });

        if (response.ok) {
            showToast('Order cancelled successfully', 'success');
            // Reload order details
            loadOrderDetail(orderId);
        } else {
            const data = await response.json();
            showToast(data.detail || 'Failed to cancel order', 'danger');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('An error occurred. Please try again.', 'danger');
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
