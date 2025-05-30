// /frontend/assets/js/product.js
import api from './api.js';
import auth from './auth.js';

// SCHEMA TYPEDEFS (JSDoc)
/**
 * @typedef {Object} ProductCreate
 * @property {string} name
 * @property {string} description
 * @property {number} price
 * @property {number} stock
 * @property {string|null} category_id
 * @property {string|null} sku
 * @property {boolean} [active=true]
 * @property {string[]} [images=[]]
 */
/**
 * @typedef {Object} ProductUpdate
 * @property {string|null} name
 * @property {string|null} description
 * @property {number|null} price
 * @property {number|null} stock
 * @property {string|null} category_id
 * @property {string|null} sku
 * @property {boolean|null} active
 * @property {string[]} [images=[]]
 */
/**
 * @typedef {Object} ProductResponse
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} price
 * @property {number} stock
 * @property {string|null} category_id
 * @property {string|null} category_name
 * @property {string|null} sku
 * @property {boolean} active
 * @property {string[]} images
 * @property {string} seller_id
 * @property {string} seller_name
 * @property {number} average_rating
 * @property {number} review_count
 * @property {string} created_at
 * @property {string} updated_at
 */
/**
 * @typedef {Object} ProductListResponse
 * @property {ProductResponse[]} products
 * @property {number} total
 * @property {number} page
 * @property {number} size
 * @property {number} pages
 */

class Product {
    constructor() {
        this.currentProduct = null;
        this.init();
    }

    async init() {
        // Load sản phẩm từ URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (productId) {
            await this.loadProductDetail(productId);
        } else {
            await this.loadProducts();
        }

        // Thiết lập event listeners
        this.setupEventListeners();
    }

    async loadProducts() {
        try {
            const products = await api.getProducts();
            const productList = document.getElementById('product-list');
            
            if (!products.length) {
                productList.innerHTML = '<div class="text-center p-3">Không có sản phẩm nào</div>';
                return;
            }

            productList.innerHTML = products.map(product => `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <img src="${product.image}" class="card-img-top" alt="${product.name}">
                        <div class="card-body">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="card-text">${product.description}</p>
                            <p class="card-text">
                                <strong>${product.price.toLocaleString('vi-VN')}đ</strong>
                            </p>
                            <div class="d-flex justify-content-between">
                                <button class="btn btn-primary" onclick="product.addToCart('${product.id}')">
                                    Thêm vào giỏ
                                </button>
                                <button class="btn btn-outline-primary" onclick="product.addToWishlist('${product.id}')">
                                    <i class="bi bi-heart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading products:', error);
            alert('Không thể tải danh sách sản phẩm');
        }
    }

    async loadProductDetail(productId) {
        try {
            const product = await api.getProductDetail(productId);
            this.currentProduct = product;
            
            const productDetail = document.getElementById('product-detail');
            productDetail.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <img src="${product.image}" class="img-fluid" alt="${product.name}">
                    </div>
                    <div class="col-md-6">
                        <h2>${product.name}</h2>
                        <p class="text-muted">${product.description}</p>
                        <h3 class="text-primary">${product.price.toLocaleString('vi-VN')}đ</h3>
                        <div class="mb-3">
                            <label class="form-label">Số lượng</label>
                            <input type="number" class="form-control" id="quantity" value="1" min="1">
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary" onclick="product.addToCart('${product.id}')">
                                Thêm vào giỏ
                            </button>
                            <button class="btn btn-outline-primary" onclick="product.addToWishlist('${product.id}')">
                                <i class="bi bi-heart"></i> Yêu thích
                            </button>
                            <button class="btn btn-outline-secondary" onclick="product.compareProducts('${product.id}')">
                                <i class="bi bi-arrow-left-right"></i> So sánh
                            </button>
                        </div>
                    </div>
                </div>
                <div class="row mt-4">
                    <div class="col-12">
                        <h3>Đánh giá sản phẩm</h3>
                        <div id="product-reviews">
                            ${this.renderReviews(product.reviews)}
                        </div>
                        ${auth.isAuthenticated() ? this.renderReviewForm() : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading product detail:', error);
            alert('Không thể tải thông tin sản phẩm');
        }
    }

    renderReviews(reviews) {
        if (!reviews.length) {
            return '<p>Chưa có đánh giá nào</p>';
        }

        return reviews.map(review => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6 class="card-subtitle mb-2 text-muted">${review.user_name}</h6>
                        <div class="text-warning">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                        </div>
                    </div>
                    <p class="card-text">${review.comment}</p>
                    <small class="text-muted">${new Date(review.created_at).toLocaleDateString('vi-VN')}</small>
                </div>
            </div>
        `).join('');
    }

    renderReviewForm() {
        return `
            <form id="review-form" class="mt-3">
                <div class="mb-3">
                    <label class="form-label">Đánh giá của bạn</label>
                    <div class="rating">
                        ${[1, 2, 3, 4, 5].map(rating => `
                            <input type="radio" name="rating" value="${rating}" id="rating${rating}">
                            <label for="rating${rating}">★</label>
                        `).join('')}
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Nhận xét</label>
                    <textarea class="form-control" id="review-comment" rows="3" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Gửi đánh giá</button>
            </form>
        `;
    }

    setupEventListeners() {
        // Xử lý form đánh giá
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'review-form') {
                e.preventDefault();
                if (!this.currentProduct) return;

                const rating = document.querySelector('input[name="rating"]:checked')?.value;
                const comment = document.getElementById('review-comment').value;

                if (!rating || !comment) {
                    alert('Vui lòng điền đầy đủ thông tin đánh giá');
                    return;
                }

                try {
                    await api.createReview(this.currentProduct.id, rating, comment);
                    await this.loadProductDetail(this.currentProduct.id);
                    e.target.reset();
                } catch (error) {
                    console.error('Error submitting review:', error);
                    alert('Không thể gửi đánh giá');
                }
            }
        });
    }

    async addToCart(productId) {
        if (!auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }

        try {
            const quantity = document.getElementById('quantity')?.value || 1;
            await api.addToCart(productId, parseInt(quantity));
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

    async compareProducts(productId) {
        if (!this.currentProduct) return;

        const compareUrl = `../pages/product-comparison.html?id1=${this.currentProduct.id}&id2=${productId}`;
        window.location.href = compareUrl;
    }

    isInWishlist(productId) {
        // Kiểm tra xem sản phẩm có trong danh sách yêu thích không
        const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        return wishlist.includes(productId);
    }
}

const product = new Product();
window.product = product; // Make product globally available
export default product;