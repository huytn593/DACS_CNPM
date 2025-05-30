import api from './api.js';
import auth from './auth.js';

let currentStatus = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isAuthenticated() || !auth.isSeller()) {
        window.location.href = '../index.html';
        return;
    }
    setupStatusFilter();
    await loadSellerOrders();
});

function setupStatusFilter() {
    document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            currentStatus = item.getAttribute('data-status');
            await loadSellerOrders();
        });
    });
}

async function loadSellerOrders() {
    const tableBody = document.getElementById('orders-table');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';
    try {
        const orders = await api.getSellerOrders(currentStatus); // Trả về danh sách đơn hàng theo trạng thái
        if (!orders || orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">Không có đơn hàng nào</td></tr>';
            return;
        }
        tableBody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.order_number || order.id}</td>
                <td>${order.customer_name}</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td><span class="badge bg-${getStatusBadgeColor(order.status)}">${getStatusText(order.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="showOrderStatusModal('${order.id}')">Cập nhật</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="6">Lỗi tải đơn hàng</td></tr>';
    }
}

window.showOrderStatusModal = function(orderId) {
    const modal = new bootstrap.Modal(document.getElementById('orderStatusModal'));
    document.getElementById('order-id').value = orderId;
    modal.show();
};

document.getElementById('save-order-status')?.addEventListener('click', async () => {
    const orderId = document.getElementById('order-id').value;
    const status = document.getElementById('order-status').value;
    const note = document.getElementById('order-note').value;
    try {
        await api.updateOrderStatus(orderId, status, note);
        bootstrap.Modal.getInstance(document.getElementById('orderStatusModal')).hide();
        await loadSellerOrders();
    } catch (error) {
        alert('Lỗi cập nhật trạng thái đơn hàng');
    }
});

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadgeColor(status) {
    const colorMap = {
        'pending': 'warning',
        'confirmed': 'info',
        'shipping': 'primary',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colorMap[status] || 'secondary';
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'shipping': 'Đang giao hàng',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
}
