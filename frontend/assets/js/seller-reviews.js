import api from './api.js';
import auth from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.isAuthenticated() || !auth.isSeller()) {
        window.location.href = '../index.html';
        return;
    }
    await loadSellerReviews();
});

async function loadSellerReviews() {
    const tableBody = document.getElementById('reviews-table');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';
    try {
        const reviews = await api.getSellerReviews(); // Trả về danh sách đánh giá sản phẩm của seller
        if (!reviews || reviews.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">Chưa có đánh giá nào</td></tr>';
            return;
        }
        tableBody.innerHTML = reviews.map(review => `
            <tr>
                <td>${review.id}</td>
                <td>${review.product_name}</td>
                <td>${review.customer_name}</td>
                <td>${renderStars(review.rating)}</td>
                <td>${review.comment || ''}</td>
                <td>${formatDate(review.created_at)}</td>
            </tr>
        `).join('');
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="6">Lỗi tải đánh giá</td></tr>';
    }
}

function renderStars(rating) {
    rating = Math.round(rating) || 0;
    return '<span style="color:#ffc107;">' + '★'.repeat(rating) + '☆'.repeat(5-rating) + '</span>';
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