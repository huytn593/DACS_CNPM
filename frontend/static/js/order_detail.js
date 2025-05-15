
document.addEventListener('DOMContentLoaded', function() {
    // Get order ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (orderId) {
        fetchOrderDetails(orderId);
    } else {
        // Show error and redirect after a short delay
        showError('Order ID not provided');
        setTimeout(() => {
            window.location.href = '/orders.html';  // or your orders list page
        }, 3000);
    }

    // Download invoice button
    document.getElementById('downloadInvoiceBtn').addEventListener('click', function() {
        if (orderId) {
            downloadInvoice(orderId);
        }
    });
});

// Fetch order details from API
async function fetchOrderDetails(orderId) {
    try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        const response = await fetch(`/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order details');
        }

        const orderData = await response.json();
        displayOrderDetails(orderData);
    } catch (error) {
        console.error('Error fetching order details:', error);
        showError('Could not load order details. Please try again later.');
    }
}

// Display order details on the page
function displayOrderDetails(order) {
    // Set order information
    document.getElementById('orderId').textContent = order.order_number || order.id;
    document.getElementById('orderStatus').textContent = capitalizeFirstLetter(order.status);

    // Set appropriate status badge color
    const statusBadge = document.getElementById('orderStatus');
    switch(order.status) {
        case 'pending':
            statusBadge.className = 'badge bg-warning';
            break;
        case 'processing':
            statusBadge.className = 'badge bg-info';
            break;
        case 'shipped':
            statusBadge.className = 'badge bg-primary';
            break;
        case 'delivered':
            statusBadge.className = 'badge bg-success';
            break;
        case 'cancelled':
            statusBadge.className = 'badge bg-danger';
            break;
        default:
            statusBadge.className = 'badge bg-secondary';
    }

    // Format date (assuming ISO format from API)
    const orderDate = new Date(order.created_at);
    document.getElementById('orderDate').textContent = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('paymentMethod').textContent = order.payment_method || 'Credit Card';

    // Set addresses
    if (order.shipping_address) {
        document.getElementById('shippingAddress').innerHTML = formatAddress(order.shipping_address);
    }

    if (order.billing_address) {
        document.getElementById('billingAddress').innerHTML = formatAddress(order.billing_address);
    } else if (order.shipping_address) {
        // If billing address not provided, use shipping address
        document.getElementById('billingAddress').innerHTML = formatAddress(order.shipping_address);
    }

    // Display order items
    const orderItemsContainer = document.getElementById('orderItems');
    orderItemsContainer.innerHTML = ''; // Clear loading state

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemRow = document.createElement('tr');

            itemRow.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${item.image || '/frontend/static/images/product-placeholder.jpg'}" width="60" class="img-fluid rounded me-3" alt="${item.name}">
                        <div>
                            <h6 class="mb-0">${item.name}</h6>
                            <small class="text-muted">${getItemVariants(item)}</small>
                        </div>
                    </div>
                </td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td class="text-end">$${(item.price * item.quantity).toFixed(2)}</td>
            `;

            orderItemsContainer.appendChild(itemRow);
        });
    } else {
        orderItemsContainer.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4">No items found in this order.</td>
            </tr>
        `;
    }

    // Set order totals
    document.getElementById('subtotal').textContent = `$${order.subtotal?.toFixed(2) || '0.00'}`;
    document.getElementById('shipping').textContent = `$${order.shipping_fee?.toFixed(2) || '0.00'}`;
    document.getElementById('discount').textContent = order.discount > 0 ? `-$${order.discount.toFixed(2)}` : '$0.00';
    document.getElementById('total').textContent = `$${order.total_amount?.toFixed(2) || '0.00'}`;

    // Display order timeline
    displayOrderTimeline(order);
}

// Format address
function formatAddress(address) {
    let formattedAddress = '';

    if (address.name) formattedAddress += `${address.name}<br>`;
    if (address.street) formattedAddress += `${address.street}<br>`;
    if (address.apartment) formattedAddress += `${address.apartment}<br>`;

    let cityStateZip = '';
    if (address.city) cityStateZip += address.city;
    if (address.state) {
        if (cityStateZip) cityStateZip += ', ';
        cityStateZip += address.state;
    }
    if (address.postal_code) {
        if (cityStateZip) cityStateZip += ' ';
        cityStateZip += address.postal_code;
    }

    if (cityStateZip) formattedAddress += `${cityStateZip}<br>`;
    if (address.country) formattedAddress += `${address.country}`;

    return formattedAddress;
}

// Get item variants (size, color, etc)
function getItemVariants(item) {
    let variants = [];

    if (item.size) variants.push(`Size: ${item.size}`);
    if (item.color) variants.push(`Color: ${item.color}`);

    return variants.join(', ') || 'No variants';
}

// Display order timeline
function displayOrderTimeline(order) {
    const timelineContainer = document.getElementById('orderTimeline');
    timelineContainer.innerHTML = ''; // Clear existing timeline

    // Create timeline events based on order status and dates
    const events = [];

    // Always show order placed event
    events.push({
        title: 'Order Placed',
        date: order.created_at,
        icon: 'shopping-cart',
        color: 'dark',
        description: 'Your order has been placed successfully.'
    });

    // Add payment confirmed event if payment_date exists
    if (order.payment_date) {
        events.push({
            title: 'Payment Confirmed',
            date: order.payment_date,
            icon: 'credit-card',
            color: 'secondary',
            description: 'Your payment has been confirmed.'
        });
    }

    // Add processing event if processing_date exists
    if (order.processing_date) {
        events.push({
            title: 'Order Processing',
            date: order.processing_date,
            icon: 'box',
            color: 'info',
            description: 'Your order is being processed and packed.'
        });
    }

    // Add shipped event if shipped_date exists
    if (order.shipped_date) {
        let description = 'Your order has been shipped.';
        if (order.tracking_number) {
            description += ` Tracking number: ${order.tracking_number}`;
        }

        events.push({
            title: 'Order Shipped',
            date: order.shipped_date,
            icon: 'truck',
            color: 'primary',
            description: description
        });
    }

    // Add delivered event if delivered_date exists
    if (order.delivered_date) {
        events.push({
            title: 'Order Delivered',
            date: order.delivered_date,
            icon: 'check',
            color: 'success',
            description: 'Your order has been delivered successfully.'
        });
    }

    // Add cancelled event if cancelled_date exists
    if (order.cancelled_date) {
        events.push({
            title: 'Order Cancelled',
            date: order.cancelled_date,
            icon: 'times',
            color: 'danger',
            description: order.cancellation_reason || 'Your order has been cancelled.'
        });
    }

    // Sort events by date (most recent first)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create timeline HTML
    events.forEach(event => {
        const date = new Date(event.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.innerHTML = `
            <div class="timeline-badge bg-${event.color}">
                <i class="fas fa-${event.icon}"></i>
            </div>
            <div class="timeline-content">
                <h6>${event.title}</h6>
                <p class="text-muted">${formattedDate}</p>
                <p>${event.description}</p>
            </div>
        `;

        timelineContainer.appendChild(timelineItem);
    });
}

// Download invoice
async function downloadInvoice(orderId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        // Change button state to loading
        const button = document.getElementById('downloadInvoiceBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Invoice...';
        button.disabled = true;

        const response = await fetch(`/api/orders/${orderId}/invoice`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to generate invoice');
        }

        // Get the blob
        const blob = await response.blob();

        // Create URL for the blob
        const url = window.URL.createObjectURL(blob);

        // Create a link and click it to trigger the download
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
    } catch (error) {
        console.error('Error downloading invoice:', error);
        alert('Could not download invoice. Please try again later.');

        // Restore button state
        const button = document.getElementById('downloadInvoiceBtn');
        button.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Download Invoice';
        button.disabled = false;
    }
}

// Show error message
function showError(message) {
    // Create or update error element
    let errorElement = document.getElementById('errorMessage');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'errorMessage';
        errorElement.className = 'alert alert-danger my-3';
        // Insert it at the beginning of the main content area
        const mainContent = document.querySelector('.container.py-4');
        if (mainContent) {
            mainContent.insertBefore(errorElement, mainContent.firstChild);
        } else {
            document.body.insertBefore(errorElement, document.body.firstChild);
        }
    }

    errorElement.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;

    // Scroll to the error message
    window.scrollTo(0, 0);
}

// Helper function to capitalize first letter of a string
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}