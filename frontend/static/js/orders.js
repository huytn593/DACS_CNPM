// Khởi tạo trang Orders
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('accessToken');

    if (!token) {
        // Chuyển hướng đến trang đăng nhập
        window.location.href = '/login.html?returnUrl=' + encodeURIComponent('/orders.html');
        return;
    }

    // Cập nhật trạng thái người dùng trong header
    updateUserState();

    // Tải đơn hàng
    await loadOrders();

    // Load danh mục sản phẩm động
    loadCategories();

    // Thêm event listeners
    document.getElementById('filterOrdersBtn').addEventListener('click', () => {
        loadOrders();
    });

    // Đặt giá trị mặc định cho bộ lọc ngày (nếu chưa có)
    if (!document.getElementById('orderToDate').value) {
        document.getElementById('orderToDate').valueAsDate = new Date();
    }

    // Đặt ngày bắt đầu là 3 tháng trước nếu chưa có
    if (!document.getElementById('orderFromDate').value) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        document.getElementById('orderFromDate').valueAsDate = threeMonthsAgo;
    }
});

// Tải danh sách đơn hàng
async function loadOrders() {
    const token = localStorage.getItem('accessToken');
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const fromDate = document.getElementById('orderFromDate').value;
    const toDate = document.getElementById('orderToDate').value;

    // Hiển thị loading
    document.getElementById('ordersList').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;

    try {
        // Xây dựng URL với các tham số lọc
        let url = '/orders';
        const params = new URLSearchParams();

        if (statusFilter) {
            params.append('status', statusFilter);
        }

        if (fromDate) {
            params.append('from_date', fromDate);
        }

        if (toDate) {
            params.append('to_date', toDate);
        }

        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        const orders = await response.json();

        if (orders.length === 0) {
            document.getElementById('ordersList').innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i> You don't have any orders yet.
                </div>
            `;
            return;
        }

        // Hiển thị danh sách đơn hàng
        displayOrders(orders);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('ordersList').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i> Failed to load orders. Please try again later.
            </div>
        `;
    }
}

// Hiển thị danh sách đơn hàng
function displayOrders(orders) {
    const ordersListElement = document.getElementById('ordersList');

    // Xóa nội dung hiện tại
    ordersListElement.innerHTML = '';

    // Sắp xếp đơn hàng theo thời gian tạo (mới nhất trước)
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Tạo các card cho từng đơn hàng
    orders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
        const orderTime = new Date(order.created_at).toLocaleTimeString('vi-VN');

        // Tạo badge cho trạng thái đơn hàng
        let statusBadge = '';
        switch (order.status) {
            case 'pending':
                statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                break;
            case 'processing':
                statusBadge = '<span class="badge bg-info">Processing</span>';
                break;
            case 'shipped':
                statusBadge = '<span class="badge bg-primary">Shipped</span>';
                break;
            case 'delivered':
                statusBadge = '<span class="badge bg-success">Delivered</span>';
                break;
            case 'cancelled':
                statusBadge = '<span class="badge bg-danger">Cancelled</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-secondary">Unknown</span>';
        }

        // Tạo ảnh thumbnail cho các sản phẩm
        const itemThumbnails = order.items.slice(0, 3).map(item => {
            return `
                <img src="${item.image || '/static/images/product-placeholder.jpg'}"
                    class="img-thumbnail me-1"
                    width="40" height="40"
                    style="object-fit: cover;"
                    alt="${item.name}"
                    title="${item.name}">
            `;
        }).join('');

        // Hiển thị "... và X sản phẩm khác" nếu có nhiều hơn 3 sản phẩm
        const moreItemsText = order.items.length > 3 ?
            `<span class="ms-1 text-muted">+ ${order.items.length - 3} more items</span>` : '';

        // Tạo card cho đơn hàng
        const orderCard = document.createElement('div');
        orderCard.className = 'card mb-3';
        orderCard.innerHTML = `
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <h6 class="mb-1">Order #${order.order_number}</h6>
                        <p class="text-muted mb-0 small">${orderDate} at ${orderTime}</p>
                    </div>
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            ${itemThumbnails}
                            ${moreItemsText}
                        </div>
                    </div>
                    <div class="col-md-2 text-center">
                        ${statusBadge}
                    </div>
                    <div class="col-md-2 text-center">
                        <h6 class="mb-0">${formatCurrency(order.total_amount)}</h6>
                    </div>
                    <div class="col-md-2 text-end">
                        <button class="btn btn-sm btn-outline-primary view-order-btn" data-order-id="${order.id}">
                            <i class="fas fa-eye me-1"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `;

        ordersListElement.appendChild(orderCard);
    });

    // Thêm event listeners cho các nút xem chi tiết
    document.querySelectorAll('.view-order-btn').forEach(button => {
        button.addEventListener('click', () => {
            const orderId = button.getAttribute('data-order-id');
            openOrderDetail(orderId);
        });
    });
}

// Mở modal chi tiết đơn hàng
async function openOrderDetail(orderId) {
    const token = localStorage.getItem('accessToken');
    const orderDetailContent = document.getElementById('orderDetailContent');
    const orderDetailFooter = document.getElementById('orderDetailFooter');

    // Hiển thị modal với loading
    orderDetailContent.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;

    // Footer mặc định
    orderDetailFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
    `;

    // Hiển thị modal
    const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    orderDetailModal.show();

    try {
        const response = await fetch(`/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch order details');
        }

        const order = await response.json();

        // Tạo badge cho trạng thái đơn hàng
        let statusBadge = '';
        switch (order.status) {
            case 'pending':
                statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                break;
            case 'processing':
                statusBadge = '<span class="badge bg-info">Processing</span>';
                break;
            case 'shipped':
                statusBadge = '<span class="badge bg-primary">Shipped</span>';
                break;
            case 'delivered':
                statusBadge = '<span class="badge bg-success">Delivered</span>';
                break;
            case 'cancelled':
                statusBadge = '<span class="badge bg-danger">Cancelled</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-secondary">Unknown</span>';
        }

        // Định dạng ngày đặt hàng
        const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
        const orderTime = new Date(order.created_at).toLocaleTimeString('vi-VN');

        // Hiển thị thông tin đơn hàng
        orderDetailContent.innerHTML = `
            <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center">
                    <h5>Order #${order.order_number}</h5>
                    ${statusBadge}
                </div>
                <p class="text-muted mb-0">Placed on ${orderDate} at ${orderTime}</p>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <h6>Shipping Information</h6>
                    <p class="mb-1">${order.shipping_info.full_name}</p>
                    <p class="mb-1">${order.shipping_info.address}</p>
                    <p class="mb-1">${order.shipping_info.district}, ${order.shipping_info.city} ${order.shipping_info.zip_code || ''}</p>
                    <p class="mb-1">Phone: ${order.shipping_info.phone}</p>
                    <p class="mb-0">Email: ${order.shipping_info.email}</p>
                </div>
                <div class="col-md-6">
                    <h6>Payment Information</h6>
                    <p class="mb-1">Method: ${getPaymentMethodName(order.payment_method)}</p>
                    <p class="mb-0">Status: ${order.status === 'cancelled' ? 'Cancelled' : 'Paid'}</p>
                </div>
            </div>

            <div class="mb-4">
                <h6>Order Items</h6>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Quantity</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <img src="${item.image || '/static/images/product-placeholder.jpg'}"
                                                class="img-thumbnail me-2"
                                                width="50" height="50"
                                                style="object-fit: cover;"
                                                alt="${item.name}">
                                            <div>
                                                <p class="mb-0">${item.name}</p>
                                                ${item.size || item.color ? `
                                                    <small class="text-muted">
                                                        ${item.size ? `Size: ${item.size}` : ''}
                                                        ${item.size && item.color ? ' | ' : ''}
                                                        ${item.color ? `Color: ${item.color}` : ''}
                                                    </small>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td>${formatCurrency(item.price)}</td>
                                    <td>${item.quantity}</td>
                                    <td>${formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="text-end"><strong>Subtotal:</strong></td>
                                <td>${formatCurrency(order.total_amount - (order.shipping_fee || 30000))}</td>
                            </tr>
                            <tr>
                                <td colspan="3" class="text-end"><strong>Shipping Fee:</strong></td>
                                <td>${formatCurrency(order.shipping_fee || 30000)}</td>
                            </tr>
                            <tr>
                                <td colspan="3" class="text-end"><strong>Total:</strong></td>
                                <td><strong>${formatCurrency(order.total_amount)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            ${order.shipping_info.notes ? `
                <div class="mb-4">
                    <h6>Order Notes</h6>
                    <p class="mb-0">${order.shipping_info.notes}</p>
                </div>
            ` : ''}
        `;

        // Thêm nút hủy đơn hàng nếu đơn hàng có thể hủy (pending hoặc processing)
        if (order.status === 'pending' || order.status === 'processing') {
            orderDetailFooter.innerHTML = `
                <button type="button" class="btn btn-danger cancel-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-times me-1"></i> Cancel Order
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            `;

            // Thêm event listener cho nút hủy
            document.querySelector('.cancel-order-btn').addEventListener('click', () => {
                cancelOrder(order.id);
            });
        }

    } catch (error) {
        console.error('Error:', error);
        orderDetailContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i> Failed to load order details. Please try again later.
            </div>
        `;
    }
}

// Hủy đơn hàng
async function cancelOrder(orderId) {
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
        const token = localStorage.getItem('accessToken');

        try {
            const response = await fetch(`/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel order');
            }

            // Đóng modal
            const orderDetailModal = bootstrap.Modal.getInstance(document.getElementById('orderDetailModal'));
            orderDetailModal.hide();

            // Hiển thị thông báo thành công
            showAlert('Order cancelled successfully', 'success');

            // Tải lại danh sách đơn hàng
            loadOrders();

        } catch (error) {
            console.error('Error:', error);
            showAlert('Failed to cancel order', 'danger');
        }
    }
}

// Lấy tên phương thức thanh toán
function getPaymentMethodName(method) {
    switch (method) {
        case 'cod':
            return 'Cash on Delivery';
        case 'bank':
            return 'Bank Transfer';
        case 'card':
            return 'Credit/Debit Card';
        case 'momo':
            return 'MoMo Wallet';
        default:
            return 'Unknown';
    }
}

// Định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hiển thị thông báo
function showAlert(message, type = 'info') {
    // Tạo một alert và append vào body
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertElement.style.top = '20px';
    alertElement.style.right = '20px';
    alertElement.style.zIndex = '9999';

    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    document.body.appendChild(alertElement);

    // Tự động ẩn alert sau 5 giây
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    }, 5000);
}