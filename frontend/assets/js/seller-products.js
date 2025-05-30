import api from './api.js';
import auth from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isAuthenticated() || !auth.isSeller()) {
        window.location.href = '../index.html';
        return;
    }
    await loadSellerProducts();
});

async function loadSellerProducts() {
    const tableBody = document.getElementById('products-table');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';
    try {
        const products = await api.getSellerProducts(); // Trả về danh sách sản phẩm của seller
        if (!products || products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">Không có sản phẩm nào</td></tr>';
            return;
        }
        tableBody.innerHTML = products.map(product => `
            <tr>
                <td><img src="${product.images?.[0] || '../assets/img/placeholder.svg'}" alt="${product.name}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;"></td>
                <td>${product.name}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${product.status || 'Đang bán'}</td>
                <td>
                    <a href="#" class="btn btn-sm btn-outline-primary" onclick="editProduct('${product.id}')">Sửa</a>
                    <a href="#" class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product.id}')">Xóa</a>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="6">Lỗi tải sản phẩm</td></tr>';
    }
}

window.editProduct = function(productId) {
    alert('Chức năng sửa sản phẩm sẽ được phát triển sau!');
};

window.deleteProduct = async function(productId) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
        await api.deleteProduct(productId);
        await loadSellerProducts();
    } catch (error) {
        alert('Lỗi xóa sản phẩm');
    }
};

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value);
} 