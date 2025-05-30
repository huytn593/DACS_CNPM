import api from './api.js';
import auth from './auth.js';

class OrderFlow {
    constructor() {
        this.currentOrder = null;
        this.init();
    }

    async init() {
        // Kiểm tra quyền truy cập
        if (!auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }

        // Load danh sách đơn hàng
        await this.loadOrders();

        // Thiết lập event listeners
        this.setupEventListeners();
    }

    async loadOrders() {
        try {
            const orders = await api.getOrders();
            const orderList = document.getElementById('order-list');
            
            if (!orders.length) {
                orderList.innerHTML = '<div class="text-center p-3">Không có đơn hàng nào</div>';
                return;
            }

            orderList.innerHTML = orders.map(order => `
                <div class="list-group-item list-group-item-action" data-order-id="${order.id}">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">Đơn hàng #${order.order_number}</h6>
                        <small class="text-muted">${new Date(order.created_at).toLocaleDateString('vi-VN')}</small>
                    </div>
                    <p class="mb-1">${order.items_count} sản phẩm - ${order.total_amount.toLocaleString('vi-VN')}đ</p>
                    <small class="badge bg-${this.getStatusColor(order.status)}">${this.getStatusText(order.status)}</small>
                </div>
            `).join('');

            // Thêm event click cho từng đơn hàng
            orderList.querySelectorAll('.list-group-item').forEach(item => {
                item.addEventListener('click', () => this.loadOrderDetails(item.dataset.orderId));
            });
        } catch (error) {
            console.error('Error loading orders:', error);
            alert('Không thể tải danh sách đơn hàng');
        }
    }

    async loadOrderDetails(orderId) {
        try {
            const order = await api.getOrderDetails(orderId);
            this.currentOrder = order;
            
            const detailsContainer = document.getElementById('order-details');
            detailsContainer.innerHTML = `
                <div class="order-info">
                    <h6>Thông tin đơn hàng #${order.order_number}</h6>
                    <p>Ngày đặt: ${new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                    <p>Trạng thái: <span class="badge bg-${this.getStatusColor(order.status)}">${this.getStatusText(order.status)}</span></p>
                    
                    <h6 class="mt-3">Thông tin người nhận</h6>
                    <p>${order.shipping_address}</p>
                    <p>${order.phone_number}</p>
                    
                    <h6 class="mt-3">Sản phẩm</h6>
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item d-flex align-items-center mb-2">
                                <img src="${item.product_image}" alt="${item.product_name}" class="me-2" style="width: 50px; height: 50px; object-fit: cover;">
                                <div>
                                    <div>${item.product_name}</div>
                                    <small>${item.quantity} x ${item.price.toLocaleString('vi-VN')}đ</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="order-total mt-3">
                        <h6>Tổng cộng: ${order.total_amount.toLocaleString('vi-VN')}đ</h6>
                    </div>
                    
                    <div class="order-actions mt-3">
                        ${this.getOrderActions(order)}
                    </div>
                </div>
            `;

            // Thêm event listeners cho các nút hành động
            this.setupOrderActionListeners();
        } catch (error) {
            console.error('Error loading order details:', error);
            alert('Không thể tải chi tiết đơn hàng');
        }
    }

    getStatusColor(status) {
        const colors = {
            pending: 'warning',
            confirmed: 'info',
            shipping: 'primary',
            completed: 'success',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            pending: 'Chờ xác nhận',
            confirmed: 'Đã xác nhận',
            shipping: 'Đang giao hàng',
            completed: 'Hoàn thành',
            cancelled: 'Đã hủy'
        };
        return texts[status] || status;
    }

    getOrderActions(order) {
        const actions = [];
        
        if (order.status === 'pending') {
            actions.push(`
                <button class="btn btn-primary btn-sm me-2" onclick="orderFlow.confirmOrder('${order.id}')">
                    Xác nhận
                </button>
                <button class="btn btn-danger btn-sm" onclick="orderFlow.cancelOrder('${order.id}')">
                    Hủy đơn
                </button>
            `);
        } else if (order.status === 'confirmed') {
            actions.push(`
                <button class="btn btn-primary btn-sm" onclick="orderFlow.shipOrder('${order.id}')">
                    Giao hàng
                </button>
            `);
        } else if (order.status === 'shipping') {
            actions.push(`
                <button class="btn btn-success btn-sm" onclick="orderFlow.completeOrder('${order.id}')">
                    Hoàn thành
                </button>
            `);
        }

        return actions.join('');
    }

    setupEventListeners() {
        // Lưu trạng thái đơn hàng
        document.getElementById('save-order-status').addEventListener('click', async () => {
            if (!this.currentOrder) return;

            const status = document.getElementById('order-status').value;
            const note = document.getElementById('order-note').value;

            try {
                await api.updateOrderStatus(this.currentOrder.id, status, note);
                await this.loadOrders();
                await this.loadOrderDetails(this.currentOrder.id);
                bootstrap.Modal.getInstance(document.getElementById('orderStatusModal')).hide();
            } catch (error) {
                console.error('Error updating order status:', error);
                alert('Không thể cập nhật trạng thái đơn hàng');
            }
        });
    }

    setupOrderActionListeners() {
        // Các event listeners sẽ được thêm động khi load chi tiết đơn hàng
    }

    async confirmOrder(orderId) {
        try {
            await api.updateOrderStatus(orderId, 'confirmed');
            await this.loadOrders();
            await this.loadOrderDetails(orderId);
        } catch (error) {
            console.error('Error confirming order:', error);
            alert('Không thể xác nhận đơn hàng');
        }
    }

    async shipOrder(orderId) {
        try {
            await api.updateOrderStatus(orderId, 'shipping');
            await this.loadOrders();
            await this.loadOrderDetails(orderId);
        } catch (error) {
            console.error('Error shipping order:', error);
            alert('Không thể cập nhật trạng thái giao hàng');
        }
    }

    async completeOrder(orderId) {
        try {
            await api.updateOrderStatus(orderId, 'completed');
            await this.loadOrders();
            await this.loadOrderDetails(orderId);
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Không thể hoàn thành đơn hàng');
        }
    }

    async cancelOrder(orderId) {
        if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;

        try {
            await api.updateOrderStatus(orderId, 'cancelled');
            await this.loadOrders();
            await this.loadOrderDetails(orderId);
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Không thể hủy đơn hàng');
        }
    }
}

const orderFlow = new OrderFlow();
window.orderFlow = orderFlow; // Make orderFlow globally available
export default orderFlow; 