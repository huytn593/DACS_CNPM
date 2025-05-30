import api from './api.js';
import auth from './auth.js';
import { getImageUrl } from './main.js';

// Helper: format tiền
function formatVND(num) {
    return (num || 0).toLocaleString('vi-VN') + '₫';
}

class ProductDetail {
    constructor() {
        this.productId = new URLSearchParams(window.location.search).get('id');
        this.init();
    }

    async init() {
        if (!this.productId) {
            this.showError('Không tìm thấy sản phẩm');
            return;
        }

        try {
            await this.loadProductDetail();
        } catch (error) {
            console.error('Error initializing product detail:', error);
            this.showError('Không thể tải thông tin sản phẩm');
        }
    }

    async loadProductDetail() {
        try {
            const product = await api.getProductDetail(this.productId);
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }

            this.renderProduct(product);
            await this.loadReviews();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading product detail:', error);
            this.showError('Không thể tải thông tin sản phẩm');
        }
    }

    renderProduct(product) {
        // Xử lý ảnh
        const images = Array.isArray(product.images) ? product.images.filter(img => typeof img === 'string' && getImageUrl(img)) : [];
        const mainImage = images[0] || '';
        const thumbnails = images.length > 1 ? images.slice(1, 4) : [];

        const container = document.getElementById('product-detail');
        if (!container) return;

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6 d-flex flex-column align-items-center justify-content-center">
                    <div class="product-images w-100 d-flex flex-column align-items-center">
                        <div class="main-image mb-3 d-flex align-items-center justify-content-center" style="width: 450px; height: 450px; background: #fafafa; border-radius: 8px; overflow: hidden;">
                            ${mainImage ? `<img id="main-product-image" src="${getImageUrl(mainImage)}" alt="${product.name}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block; margin: auto;" onerror="this.style.display='none'">` : ''}
                        </div>
                        ${thumbnails.length > 0 ? `
                        <div class="thumbnail-images d-flex gap-2 mt-2">
                            ${thumbnails.map((image, idx) => `
                                <img src="${getImageUrl(image)}" 
                                     class="img-thumbnail thumbnail" 
                                     style="width: 80px; height: 80px; object-fit: cover; cursor: pointer;"
                                     alt="Thumbnail ${idx+1}"
                                     onerror="this.style.display='none'"
                                     onclick="document.getElementById('main-product-image').src = '${getImageUrl(image)}'">
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="col-md-6">
                    <h1 class="product-name mb-3">${product.name}</h1>
                    <div class="product-price mb-3">
                        <span class="h2 text-danger">${product.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div class="product-description mb-4">
                        ${product.description || 'Chưa có mô tả sản phẩm'}
                    </div>
                    <div class="product-meta mb-4">
                        <p><strong>Danh mục:</strong> ${product.category_name || 'Chưa phân loại'}</p>
                        <p><strong>Người bán:</strong> ${product.seller_name || 'Chưa xác định'}</p>
                        <p><strong>Đánh giá:</strong> ${product.average_rating || 0}/5 (${product.review_count || 0} đánh giá)</p>
                    </div>
                    <div class="product-actions">
                        <div class="quantity-selector mb-3">
                            <button class="btn btn-outline-secondary" onclick="this.parentElement.querySelector('input').stepDown()">-</button>
                            <input type="number" class="form-control" value="1" min="1" max="${product.stock || 1}" style="width: 80px; display: inline-block;">
                            <button class="btn btn-outline-secondary" onclick="this.parentElement.querySelector('input').stepUp()">+</button>
                        </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary" onclick="app.addToCart('${product.id}', this.parentElement.parentElement.querySelector('.quantity-selector input').value)">
                                Thêm vào giỏ
                            </button>
                            <button class="btn btn-outline-primary" onclick="app.buyNow('${product.id}', this.parentElement.parentElement.querySelector('.quantity-selector input').value)">
                                Mua ngay
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="product-reviews mt-5">
                <h2>Đánh giá sản phẩm</h2>
                <div id="product-reviews" class="mt-4">
                    <!-- Reviews will be loaded here -->
                </div>
                ${auth.isAuthenticated() ? `
                    <div class="review-form mt-4">
                        <h3>Viết đánh giá</h3>
                        <form id="review-form" class="mt-3">
                            <div class="mb-3">
                                <label class="form-label">Đánh giá của bạn</label>
                                <div class="rating">
                                    ${[5, 4, 3, 2, 1].map(rating => `
                                        <input type="radio" name="rating" value="${rating}" id="rating${rating}" required>
                                        <label for="rating${rating}">★</label>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="comment" class="form-label">Nhận xét</label>
                                <textarea class="form-control" id="comment" name="comment" rows="3" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Gửi đánh giá</button>
                        </form>
                    </div>
                ` : `
                    <div class="alert alert-info mt-4">
                        Vui lòng <a href="../../pages/login.html">đăng nhập</a> để viết đánh giá
                    </div>
                `}
            </div>
        `;
    }

    async loadReviews() {
        try {
            const reviews = await api.getProductReviews(this.productId);
            this.renderReviews(reviews || []);
        } catch (error) {
            console.error('Error loading reviews:', error);
            const reviewsContainer = document.getElementById('product-reviews');
            if (reviewsContainer) {
                reviewsContainer.innerHTML = '<p class="text-center text-danger">Không thể tải đánh giá sản phẩm</p>';
            }
        }
    }

    renderReviews(reviews) {
        const container = document.getElementById('product-reviews');
        if (!container) return;

        if (!reviews.length) {
            container.innerHTML = '<p class="text-center">Chưa có đánh giá nào</p>';
            return;
        }

        container.innerHTML = `
            <div class="reviews-list">
                ${reviews.map(review => `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="card-title mb-0">${review.user_name || 'Người dùng'}</h5>
                                <small class="text-muted">${new Date(review.created_at).toLocaleDateString('vi-VN')}</small>
                            </div>
                            <div class="rating mb-2">
                                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                            </div>
                            <p class="card-text">${review.comment || 'Không có nhận xét'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupEventListeners() {
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const rating = reviewForm.querySelector('input[name="rating"]:checked')?.value;
                const comment = reviewForm.querySelector('#comment').value;

                if (!rating) {
                    alert('Vui lòng chọn số sao đánh giá');
                    return;
                }

                try {
                    await api.createReview(this.productId, parseInt(rating), comment);
                    reviewForm.reset();
                    await this.loadReviews();
                    alert('Cảm ơn bạn đã đánh giá sản phẩm!');
                } catch (error) {
                    console.error('Error submitting review:', error);
                    alert('Không thể gửi đánh giá. Vui lòng thử lại sau.');
                }
            });
        }
    }

    showError(message) {
        const container = document.getElementById('product-detail');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    ${message}
                </div>
            `;
        }
    }
}

// Initialize product detail page
new ProductDetail(); 