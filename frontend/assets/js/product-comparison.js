import api from './api.js';
import auth from './auth.js';

// Helper: format tiền
function formatVND(num) {
    return (num || 0).toLocaleString('vi-VN') + '₫';
}

class ProductComparison {
    constructor() {
        this.init();
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const id1 = urlParams.get('id1');
        const id2 = urlParams.get('id2');

        if (!id1 || !id2) {
            alert('Vui lòng chọn 2 sản phẩm để so sánh');
            window.location.href = '../index.html';
            return;
        }

        await this.loadProducts(id1, id2);
        this.setupEventListeners();
    }

    async loadProducts(id1, id2) {
        try {
            const [product1, product2] = await Promise.all([
                api.getProductDetail(id1),
                api.getProductDetail(id2)
            ]);

            const comparisonContainer = document.getElementById('product-comparison');
            comparisonContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card h-100">
                            <img src="${product1.image}" class="card-img-top" alt="${product1.name}">
                            <div class="card-body">
                                <h5 class="card-title">${product1.name}</h5>
                                <p class="card-text">${product1.description}</p>
                                <p class="card-text">
                                    <strong>${product1.price.toLocaleString('vi-VN')}đ</strong>
                                </p>
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-primary" onclick="productComparison.addToCart('${product1.id}')">
                                        Thêm vào giỏ
                                    </button>
                                    <button class="btn btn-outline-primary" onclick="productComparison.addToWishlist('${product1.id}')">
                                        <i class="bi bi-heart"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card h-100">
                            <img src="${product2.image}" class="card-img-top" alt="${product2.name}">
                            <div class="card-body">
                                <h5 class="card-title">${product2.name}</h5>
                                <p class="card-text">${product2.description}</p>
                                <p class="card-text">
                                    <strong>${product2.price.toLocaleString('vi-VN')}đ</strong>
                                </p>
                                <div class="d-flex justify-content-between">
                                    <button class="btn btn-primary" onclick="productComparison.addToCart('${product2.id}')">
                                        Thêm vào giỏ
                                    </button>
                                    <button class="btn btn-outline-primary" onclick="productComparison.addToWishlist('${product2.id}')">
                                        <i class="bi bi-heart"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col-12">
                        <h3>So sánh chi tiết</h3>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Tiêu chí</th>
                                    <th>${product1.name}</th>
                                    <th>${product2.name}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Giá</td>
                                    <td>${product1.price.toLocaleString('vi-VN')}đ</td>
                                    <td>${product2.price.toLocaleString('vi-VN')}đ</td>
                                </tr>
                                <tr>
                                    <td>Đánh giá</td>
                                    <td>
                                        <div class="text-warning">
                                            ${'★'.repeat(product1.rating)}${'☆'.repeat(5 - product1.rating)}
                                            (${product1.review_count} đánh giá)
                                        </div>
                                    </td>
                                    <td>
                                        <div class="text-warning">
                                            ${'★'.repeat(product2.rating)}${'☆'.repeat(5 - product2.rating)}
                                            (${product2.review_count} đánh giá)
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Đã bán</td>
                                    <td>${product1.sold_count}</td>
                                    <td>${product2.sold_count}</td>
                                </tr>
                                <tr>
                                    <td>Còn hàng</td>
                                    <td>${product1.stock > 0 ? 'Có' : 'Hết hàng'}</td>
                                    <td>${product2.stock > 0 ? 'Có' : 'Hết hàng'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading products for comparison:', error);
            alert('Không thể tải thông tin sản phẩm để so sánh');
        }
    }

    setupEventListeners() {
        // Thêm các event listeners nếu cần
    }

    async addToCart(productId) {
        if (!auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }

        try {
            await api.addToCart(productId, 1);
            alert('Đã thêm vào giỏ hàng');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Không thể thêm vào giỏ hàng');
        }
    }

    async addToWishlist(productId) {
        if (!auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }

        try {
            await api.addToWishlist(productId);
            alert('Đã thêm vào danh sách yêu thích');
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            alert('Không thể thêm vào danh sách yêu thích');
        }
    }
}

const productComparison = new ProductComparison();
window.productComparison = productComparison; // Make productComparison globally available
export default productComparison; 