import api from './api.js';
import auth from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra quyền admin
    if (!auth.isAuthenticated() || !auth.isAdmin()) {
        window.location.href = '../index.html';
        return;
    }
    await loadAdminProducts();
});

async function loadAdminProducts() {
    const tableBody = document.getElementById('products-table');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="7">Đang tải...</td></tr>';
    try {
        const products = await api.getAllProducts(); // Hàm này cần trả về danh sách sản phẩm
        if (!products || products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7">Không có sản phẩm nào</td></tr>';
            return;
        }
        tableBody.innerHTML = products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td><img src="${product.images?.[0] || '../assets/img/placeholder.svg'}" alt="${product.name}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;"></td>
                <td>${product.name}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${product.status || 'Đang bán'}</td>
                <td>
                    <a href="#" class="btn btn-sm btn-outline-primary">Sửa</a>
                    <a href="#" class="btn btn-sm btn-outline-danger">Xóa</a>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="7">Lỗi tải sản phẩm</td></tr>';
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value);
} 