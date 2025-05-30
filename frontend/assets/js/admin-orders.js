import api from './api.js';

// Format tiền
function formatVND(num) {
    return (num || 0).toLocaleString('vi-VN') + '₫';
}

// Render danh sách đơn hàng
async function renderOrders() {
    try {
        const orders = await api.getAllOrders();
        const tbody = document.getElementById('orders-table');
        tbody.innerHTML = (orders.items || orders).map(order => `
            <tr>
                <td>#${order.order_number}</td>
                <td>${order.user_name || ''}</td>
                <td>${new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                <td>${formatVND(order.total_amount)}</td>
                <td>${order.status}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetail('${order.id}')">Chi tiết</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Lỗi khi tải danh sách đơn hàng:', error);
    }
}

// Xem chi tiết đơn hàng
async function viewOrderDetail(orderId) {
    try {
        const order = await api.getUserOrderDetail(orderId);
        alert(`Chi tiết đơn hàng #${order.order_number}:\nTổng tiền: ${formatVND(order.total_amount)}\nTrạng thái: ${order.status}`);
    } catch (error) {
        console.error('Lỗi khi tải chi tiết đơn hàng:', error);
        alert('Không thể tải chi tiết đơn hàng.');
    }
}

// Khởi tạo trang
(async function() {
    await renderOrders();
})(); 