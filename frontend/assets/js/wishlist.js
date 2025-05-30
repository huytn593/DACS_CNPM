import api from './api.js';
import auth from './auth.js';

class Wishlist {
    constructor() {
        this.init();
    }

    async init() {
        if (!auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }

        await this.loadWishlist();
        this.setupEventListeners();
    }

    async loadWishlist() {
        try {
            const wishlist = await api.getWishlist();
            const wishlistContainer = document.getElementById('wishlist-container');
            
            if (wishlistContainer) {
                if (wishlist.length === 0) {
                    wishlistContainer.innerHTML = `
                        <div class="text-center py-5">
                            <i class="bi bi-heart text-muted" style="font-size: 4rem;"></i>
                            <h4 class="mt-3">Danh sách yêu thích trống</h4>
                            <p class="text-muted">Bạn chưa thêm sản phẩm nào vào danh sách yêu thích</p>
                            <a href="../../index.html" class="btn btn-primary mt-3">Tiếp tục mua sắm</a>
                        </div>
                    `;
                    return;
                }

                wishlistContainer.innerHTML = `
                    <div class="row">
                        ${wishlist.map(item => `
                            <div class="col-md-4 mb-4">
                                <div class="card h-100">
                                    <img src="${item.product.image}" class="card-img-top" alt="${item.product.name}">
                                    <div class="card-body">
                                        <h5 class="card-title">${item.product.name}</h5>
                                        <p class="card-text text-muted">${item.product.description}</p>
                                        <h6 class="text-primary">${item.product.price.toLocaleString('vi-VN')}đ</h6>
                                        <div class="d-flex gap-2 mt-3">
                                            <button class="btn btn-primary flex-grow-1" 
                                                    onclick="wishlist.addToCart('${item.product.id}')">
                                                Thêm vào giỏ
                                            </button>
                                            <button class="btn btn-outline-danger" 
                                                    onclick="wishlist.removeFromWishlist('${item.id}')">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
            alert('Không thể tải danh sách yêu thích');
        }
    }

    setupEventListeners() {
        // Xử lý sự kiện khi người dùng click vào nút thêm vào giỏ
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.add-to-cart-btn')) {
                const productId = e.target.dataset.productId;
                await this.addToCart(productId);
            }
        });

        // Xử lý sự kiện khi người dùng click vào nút xóa khỏi danh sách yêu thích
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.remove-from-wishlist-btn')) {
                const wishlistItemId = e.target.dataset.wishlistItemId;
                await this.removeFromWishlist(wishlistItemId);
            }
        });
    }

    async addToCart(productId) {
        try {
            await api.addToCart(productId, 1);
            alert('Đã thêm vào giỏ hàng');
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Không thể thêm vào giỏ hàng');
        }
    }

    async removeFromWishlist(wishlistItemId) {
        if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi danh sách yêu thích?')) return;

        try {
            await api.removeFromWishlist(wishlistItemId);
            await this.loadWishlist();
            alert('Đã xóa khỏi danh sách yêu thích');
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            alert('Không thể xóa khỏi danh sách yêu thích');
        }
    }
}

const wishlist = new Wishlist();
window.wishlist = wishlist; // Make wishlist globally available
export default wishlist; 