// static/js/orders.js

let orders = [];
let currentPage = 1;
let totalPages = 1;
let statusFilter = "";
let searchQuery = "";
let currentOrderId = null;
const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
const cancelOrderModal = new bootstrap.Modal(document.getElementById('cancelOrderModal'));

document.addEventListener("DOMContentLoaded", function() {
    // Check if user is authenticated
    checkAuthAndUpdateUI().then(user => {
        if (!user) {
            // Redirect to login page if not authenticated
            window.location.href = "/login.html?redirect=orders.html";
            return;
        }
        
        // Check for specific order ID in URL
        const orderId = getUrlParameter("order");
        if (orderId) {
            loadOrderDetail(orderId);
        }
        
        // Load orders
        loadOrders();
    });
    
    // Initialize event listeners
    initializeEventListeners();
});

// Function to initialize event listeners
function initializeEventListeners() {
    // Status filter buttons
    document.querySelectorAll('button[data-status]').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('button[data-status]').forEach(btn => {
                btn.classList.remove('btn-warning', 'btn-info', 'btn-primary', 'btn-success', 'btn-danger', 'btn-secondary');
                btn.classList.add('btn-outline-secondary', 'btn-outline-warning', 'btn-outline-info', 'btn-outline-primary', 'btn-outline-success', 'btn-outline-danger');
            });
            
            // Add active class to clicked button
            this.classList.remove('btn-outline-secondary', 'btn-outline-warning', 'btn-outline-info', 'btn-outline-primary', 'btn-outline-success', 'btn-outline-danger');
            
            // Set appropriate color based on status
            const status = this.getAttribute('data-status');
            if (status === 'pending') {
                this.classList.add('btn-warning');
            } else if (status === 'processing') {
                this.classList.add('btn-info');
            } else if (status === 'shipped') {
                this.classList.add('btn-primary');
            } else if (status === 'delivered') {
                this.classList.add('btn-success');
            } else if (status === 'cancelled') {
                this.classList.add('btn-danger');
            } else {
                this.classList.add('btn-secondary');
            }
            
            // Update filter and reload orders
            statusFilter = status;
            currentPage = 1;
            loadOrders();
        });
    });
    
    // Search button
    document.getElementById('searchBtn').addEventListener('click', function() {
        searchQuery = document.getElementById('searchInput').value.trim();
        currentPage = 1;
        loadOrders();
    });
    
    // Search input enter key
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchQuery = this.value.trim();
            currentPage = 1;
            loadOrders();
        }
    });
    
    // Confirm cancel order button
    document.getElementById('confirmCancelBtn').addEventListener('click', function() {
        const reason = document.getElementById('cancelReason').value.trim();
        cancelOrder(currentOrderId, reason);
    });
}

// Function to load orders
async function loadOrders() {
    try {
        document.getElementById('orderListLoading').style.display = 'block';
        document.getElementById('orderList').style.display = 'none';
        document.getElementById('emptyOrders').style.display = 'none';
        document.getElementById('pagination').style.display = 'none';
        
        // Build query parameters
        let queryParams = `page=${currentPage}`;
        if (statusFilter) {
            queryParams += `&status=${statusFilter}`;
        }
        if (searchQuery) {
            queryParams += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        const response = await fetch(`/api/orders?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            orders = data.orders;
            totalPages = data.pages;
            
            // Check if there are orders
            if (orders.length === 0) {
                document.getElementById('emptyOrders').style.display = 'flex';
                document.getElementById('orderList').innerHTML = '';
                document.getElementById('pagination').style.display = 'none';
            } else {
                renderOrders(orders);
                renderPagination(currentPage, totalPages);
                document.getElementById('orderList').style.display = 'block';
                document.getElementById('pagination').style.display = 'flex';
            }
        } else {
            document.getElementById('emptyOrders').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('emptyOrders').style.display = 'flex';
    } finally {
        document.getElementById('orderListLoading').style.display = 'none';
    }
}

// Function to render orders
function renderOrders(orders) {
    const orderListContainer = document.getElementById('orderList');
    orderListContainer.innerHTML = '';
    
    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const formattedDate = formatDate(order.created_at);
        
        // Generate status badge
        const statusBadgeClass = getStatusBadgeClass(order.status);
        const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
        
        // Calculate number of items
        const itemCount = order.items.length;
        const itemText = itemCount === 1 ? '1 item' : `${itemCount} items`;
        
        // Create order card
        orderListContainer.innerHTML += `
            <div class="card order-card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h5 class="mb-1">Order #${order.id.substring(order.id.length - 8)}</h5>
                            <p class="text-muted mb-0">${formattedDate}</p>
                        </div>
                        <div class="col-md-6 text-md-end">
                            <span class="badge ${statusBadgeClass} status-badge mb-2">${statusText}</span>
                            <p class="mb-0">${formatCurrency(order.total_amount)}</p>
                        </div>
                    </div>
                    <hr>
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="d-flex flex-wrap">
                                ${order.items.slice(0, 3).map(item => `
                                    <div class="me-2 mb-2">
                                        <img src="${item.image_url || '/static/img/default-product.jpg'}" alt="${item.product_name}" 
                                            class="rounded" width="50" height="50" style="object-fit: cover;">
                                    </div>
                                `).join('')}
                                ${order.items.length > 3 ? `
                                    <div class="me-2 mb-2 d-flex align-items-center justify-content-center bg-light rounded" 
                                        style="width: 50px; height: 50px;">
                                        <small>+${order.items.length - 3}</small>
                                    </div>
                                ` : ''}
                            </div>
                            <p class="text-muted mb-0 mt-2">${itemText}</p>
                        </div>
                        <div class="col-md-4 text-md-end mt-3 mt-md-0">
                            <button class="btn btn-primary btn-sm view-order-btn" data-order-id="${order.id}">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Add event listeners to view order buttons
    document.querySelectorAll('.view-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            loadOrderDetail(orderId);
        });
    });
}

// Function to render pagination
function renderPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('paginationList');
    paginationContainer.innerHTML = '';
    
    // Previous button
    paginationContainer.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust startPage if endPage is maxed out
    if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.innerHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // Next button
    paginationContainer.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    // Add event listeners to pagination links
    document.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                loadOrders();
                // Scroll to top of the orders section
                document.querySelector('h2').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Function to load order detail
async function loadOrderDetail(orderId) {
    try {
        currentOrderId = orderId;
        
        // Show loading
        document.getElementById('orderDetailLoading').style.display = 'block';
        document.getElementById('orderDetailContent').style.display = 'none';
        
        // Open modal
        orderDetailModal.show();
        
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const order = await response.json();
            
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
            document.getElementById('orderStatusText').textContent = statusText;
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

            // Show order detail content
            document.getElementById('orderDetailLoading').style.display = 'none';
            document.getElementById('orderDetailContent').style.display = 'block';
        } else {
            alert('Failed to load order details. Please try again.');
            orderDetailModal.hide();
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
        alert('Failed to load order details. Please try again.');
        orderDetailModal.hide();
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
            <button class="btn btn-danger btn-block w-100" id="cancelOrderBtn">
                Cancel Order
            </button>
            <p class="text-muted small mt-1">
                You can cancel this order while it's still "${order.status}".
            </p>
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

            // Reload orders list
            await loadOrders();

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

// Social sharing and order action features
function addExtraOrderActions(order) {
    const actionsContainer = document.getElementById('orderActions');
    if (!actionsContainer) return;

    // Clear existing actions
    actionsContainer.innerHTML = '';

    // Add download invoice button
    actionsContainer.innerHTML += `
        <button id="downloadInvoiceBtn" class="btn btn-outline-primary me-2">
            <i class="fas fa-file-invoice me-1"></i> Download Invoice
        </button>
    `;

    // Add print order button
    actionsContainer.innerHTML += `
        <button id="printOrderBtn" class="btn btn-outline-secondary me-2" onclick="printOrderDetails()">
            <i class="fas fa-print me-1"></i> Print
        </button>
    `;

    // Add share order button
    actionsContainer.innerHTML += `
        <button id="shareOrderBtn" class="btn btn-outline-info me-2" onclick="showShareOptions()">
            <i class="fas fa-share-alt me-1"></i> Share
        </button>
    `;

    // Add action button based on order status
    if (order.status === 'delivered') {
        // For delivered orders, add a buy again button
        actionsContainer.innerHTML += `
            <button id="buyAgainBtn" class="btn btn-success" onclick="reorderItems('${order.id}')">
                <i class="fas fa-shopping-cart me-1"></i> Buy Again
            </button>
        `;
    } else if (order.status === 'cancelled') {
        // For cancelled orders, add a retry button
        actionsContainer.innerHTML += `
            <button id="retryOrderBtn" class="btn btn-primary" onclick="retryOrder('${order.id}')">
                <i class="fas fa-redo me-1"></i> Place Again
            </button>
        `;
    }

    // Add back to orders list button
    actionsContainer.innerHTML += `
        <a href="/orders.html" class="btn btn-link ms-2" id="backToOrdersBtn">
            <i class="fas fa-arrow-left me-1"></i> Back to Orders
        </a>
    `;

    // Add event listener for download invoice button
    document.getElementById('downloadInvoiceBtn').addEventListener('click', generateInvoicePDF);
}

// Function to handle order printing
function printOrderDetails() {
    // Create a clean version for printing
    createPrintView();

    // Print the document
    window.print();
}

// Create a clean view for printing
function createPrintView() {
    // Add print-specific styles if not already added
    if (!document.getElementById('print-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'print-styles';
        styleElement.textContent = `
            @media print {
                body * {
                    visibility: hidden;
                }
                #orderDetails, #orderDetails * {
                    visibility: visible;
                }
                #orderDetails {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                .btn, .nav, .footer, .no-print {
                    display: none !important;
                }
                .card {
                    border: none !important;
                    box-shadow: none !important;
                }
                .card-header {
                    background-color: #f8f9fa !important;
                    color: #000 !important;
                }
                .container {
                    max-width: 100% !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
            }
        `;
        document.head.appendChild(styleElement);
    }
}

// Share order details
function showShareOptions() {
    // Create share modal if it doesn't exist
    let shareModal = document.getElementById('shareModal');
    if (!shareModal) {
        const modalElement = document.createElement('div');
        modalElement.className = 'modal fade';
        modalElement.id = 'shareModal';
        modalElement.tabIndex = '-1';
        modalElement.setAttribute('aria-labelledby', 'shareModalLabel');
        modalElement.setAttribute('aria-hidden', 'true');

        // Order ID and current page URL
        const orderId = currentOrderId;
        const orderShortId = orderId.substring(orderId.length - 8);
        const pageUrl = window.location.href;

        modalElement.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="shareModalLabel">Share Order #${orderShortId}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Share via Social Media</label>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary" onclick="shareVia('facebook', '${pageUrl}')">
                                    <i class="fab fa-facebook-f"></i>
                                </button>
                                <button class="btn btn-outline-info" onclick="shareVia('twitter', '${pageUrl}')">
                                    <i class="fab fa-twitter"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="shareVia('whatsapp', '${pageUrl}')">
                                    <i class="fab fa-whatsapp"></i>
                                </button>
                                <button class="btn btn-outline-primary" onclick="shareVia('telegram', '${pageUrl}')">
                                    <i class="fab fa-telegram-plane"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="shareVia('email', '${pageUrl}')">
                                    <i class="fas fa-envelope"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="shareLink" class="form-label">Or Copy Link</label>
                            <div class="input-group">
                                <input type="text" class="form-control" id="shareLink" value="${pageUrl}" readonly>
                                <button class="btn btn-outline-secondary" type="button" onclick="copyShareLink()">
                                    <i class="fas fa-copy"></i>
                                </button>
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
        shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
    } else {
        shareModal = bootstrap.Modal.getInstance(document.getElementById('shareModal')) ||
                    new bootstrap.Modal(document.getElementById('shareModal'));
    }

    // Show the modal
    shareModal.show();
}

// Copy share link to clipboard
function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    shareLink.setSelectionRange(0, 99999); // For mobile devices

    navigator.clipboard.writeText(shareLink.value).then(() => {
        showToast('Link copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// Share via different platforms
function shareVia(platform, url) {
    // Get order details for sharing
    const orderIdElement = document.getElementById('orderId');
    if (!orderIdElement) return;

    const orderId = orderIdElement.textContent;
    const orderTotal = document.getElementById('orderTotal').textContent;

    // Default share text
    let shareText = `Check out my order #${orderId} with total ${orderTotal} from Fashion Store!`;
    let shareUrl = '';

    switch (platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
            break;
        case 'email':
            shareUrl = `mailto:?subject=Fashion Store Order Details&body=${encodeURIComponent(shareText + '\n\n' + url)}`;
            break;
    }

    // Open share dialog
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// Function to reorder items (buy again)
async function reorderItems(orderId) {
    try {
        // Show loading state
        const buyAgainBtn = document.getElementById('buyAgainBtn');
        if (buyAgainBtn) {
            buyAgainBtn.disabled = true;
            buyAgainBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Adding to cart...';
        }

        // Get current order details
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get order details');
        }

        const order = await response.json();

        // Add each item to cart
        for (const item of order.items) {
            await fetch('/api/cart/add', {
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
        }

        // Reset button state
        if (buyAgainBtn) {
            buyAgainBtn.disabled = false;
            buyAgainBtn.innerHTML = '<i class="fas fa-shopping-cart me-1"></i> Buy Again';
        }

        // Show success message
        showToast('All items have been added to your cart', 'success');

        // Redirect to cart page
        setTimeout(() => {
            window.location.href = '/cart.html';
        }, 1500);

    } catch (error) {
        console.error('Error reordering items:', error);
        showToast('Failed to add items to cart', 'danger');

        // Reset button state
        const buyAgainBtn = document.getElementById('buyAgainBtn');
        if (buyAgainBtn) {
            buyAgainBtn.disabled = false;
            buyAgainBtn.innerHTML = '<i class="fas fa-shopping-cart me-1"></i> Buy Again';
        }
    }
}

// Function to retry a cancelled order
async function retryOrder(orderId) {
    try {
        // Show loading state
        const retryBtn = document.getElementById('retryOrderBtn');
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';
        }

        // Same implementation as reorderItems, but with a different message
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get order details');
        }

        const order = await response.json();

        // Add each item to cart
        for (const item of order.items) {
            await fetch('/api/cart/add', {
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
        }

        // Reset button state
        if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.innerHTML = '<i class="fas fa-redo me-1"></i> Place Again';
        }

        // Show success message
        showToast('Order items have been added to your cart', 'success');

        // Redirect to checkout page directly
        setTimeout(() => {
            window.location.href = '/checkout.html';
        }, 1500);

    } catch (error) {
        console.error('Error retrying order:', error);
        showToast('Failed to process your request', 'danger');

        // Reset button state
        const retryBtn = document.getElementById('retryOrderBtn');
        if (retryBtn) {
            retryBtn.disabled = false;
            retryBtn.innerHTML = '<i class="fas fa-redo me-1"></i> Place Again';
        }
    }
}

// Add contact support section for problematic orders
function updateSupportSection(order) {
    const supportContainer = document.getElementById('supportSection');
    if (!supportContainer) return;

    // Only show support section for certain statuses
    if (['processing', 'shipped', 'cancelled'].includes(order.status)) {
        supportContainer.innerHTML = `
            <div class="card mb-3">
                <div class="card-header bg-light">
                    <h5 class="mb-0"><i class="fas fa-headset me-2"></i> Need Help?</h5>
                </div>
                <div class="card-body">
                    <p>If you have any questions or concerns about your order, our customer support team is here to help.</p>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="supportSubject" class="form-label">Subject</label>
                                <select class="form-select" id="supportSubject">
                                    <option value="order-status">Order Status Inquiry</option>
                                    <option value="delivery-issue">Delivery Issue</option>
                                    <option value="product-issue">Problem with Product</option>
                                    <option value="cancel-request">Cancellation Request</option>
                                    <option value="return-request">Return Request</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="supportOrder" class="form-label">Order ID</label>
                                <input type="text" class="form-control" id="supportOrder" value="#${order.id.substring(order.id.length - 8)}" readonly>
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="supportMessage" class="form-label">Message</label>
                        <textarea class="form-control" id="supportMessage" rows="3" placeholder="Please describe your issue..."></textarea>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <a href="tel:+84123456789" class="text-decoration-none me-3">
                                <i class="fas fa-phone-alt me-1"></i> Call Support
                            </a>
                            <a href="https://m.me/fashionstore" target="_blank" class="text-decoration-none">
                                <i class="fab fa-facebook-messenger me-1"></i> Chat
                            </a>
                        </div>
                        <button class="btn btn-primary" onclick="submitSupportRequest()">
                            Submit Request
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // For other statuses, hide the support section
        supportContainer.innerHTML = '';
    }
}

// Submit support request (simulated)
function submitSupportRequest() {
    const subject = document.getElementById('supportSubject').value;
    const orderIdShort = document.getElementById('supportOrder').value;
    const message = document.getElementById('supportMessage').value.trim();

    if (!message) {
        showToast('Please enter a message', 'warning');
        return;
    }

    // Simulate API call
    setTimeout(() => {
        // Show success message
        showToast('Your support request has been submitted. We will contact you soon.', 'success');

        // Clear message
        document.getElementById('supportMessage').value = '';
    }, 1000);
}

// Function to extract URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Enhanced loadOrderDetail function to include all new features
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

            // Update page title with short order ID
            const shortOrderId = order.id.substring(order.id.length - 8);
            document.title = `Order #${shortOrderId} - Fashion Store`;

            // Populate order details
            document.getElementById('orderId').textContent = shortOrderId;
            document.getElementById('orderDate').textContent = formatDate(order.created_at);

            // Update order status with appropriate badge color
            const statusBadge = document.getElementById('orderStatusBadge');
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
            document.getElementById('shippingName').textContent = order.shipping_info.name;
            document.getElementById('shippingPhone').textContent = order.shipping_info.phone;
            document.getElementById('shippingAddress').textContent = order.shipping_info.address;
            document.getElementById('shippingCity').textContent = order.shipping_info.city;
            document.getElementById('shippingDistrict').textContent = order.shipping_info.district;

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

            const shippingMethodEl = document.getElementById('shippingMethod');
            shippingMethodEl.textContent = order.shipping_method === 'express' ? 'Express Delivery' : 'Standard Delivery';

            // Format and populate order amounts
            document.getElementById('orderSubtotal').textContent = formatCurrency(order.subtotal_amount);
            document.getElementById('orderShippingFee').textContent = formatCurrency(order.shipping_fee);
            document.getElementById('orderTotal').textContent = formatCurrency(order.total_amount);

            // Update order items with the enhanced function
            updateOrderItems(order);

            // Update order timeline
            updateOrderTimeline(order);

            // Update cancel order section
            updateCancelOrderSection(order);

            // Update tracking information
            updateTrackingInformation(order);

            // Add extra order actions
            addExtraOrderActions(order);

            // Update support section
            updateSupportSection(order);

            // Check for notification preferences
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

// Initialize everything when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add timeline styles
    addTimelineStyles();

    // Set up smooth scrolling
    setupSmoothScroll();

    // Include needed external libraries
    loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');

    // Add Font Awesome if not already included
    if (!document.querySelector('link[href*="font-awesome"]')) {
        loadExternalStylesheet('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');
    }

    // Load order if ID is in URL
    const orderId = getUrlParameter("id");
    if (orderId) {
        loadOrderDetail(orderId);
    } else {
        document.getElementById('orderLoading').style.display = 'none';
        document.getElementById('orderNotFound').style.display = 'block';
    }

    // Create cancel order modal
    createCancelModal();
});

// Helper function to load external stylesheets
function loadExternalStylesheet(url) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`link[href="${url}"]`)) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
}

// Create cancel order modal
function createCancelModal() {
    const modalHtml = `
        <div class="modal fade" id="cancelOrderModal" tabindex="-1" aria-labelledby="cancelOrderModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="cancelOrderModalLabel">Cancel Order</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
                        <div class="mb-3">
                            <label for="cancelReason" class="form-label">Reason for cancellation (optional)</label>
                            <select class="form-select" id="cancelReason">
                                <option value="Changed my mind">Changed my mind</option>
                                <option value="Found better price elsewhere">Found better price elsewhere</option>
                                <option value="Item no longer needed">Item no longer needed</option>
                                <option value="Ordered by mistake">Ordered by mistake</option>
                                <option value="Shipping time too long">Shipping time too long</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-danger" id="confirmCancelBtn">Confirm Cancellation</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to document if it doesn't exist
    if (!document.getElementById('cancelOrderModal')) {
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
    }
}

// For demo purposes only - current order ID storage
// let currentOrderId = '';