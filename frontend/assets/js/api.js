import {config} from '/config.js';

class Api {
    constructor() {
        this.baseUrl = config.API_URL;
    }

    // Phương thức trợ giúp để gửi các request HTTP
    async request(endpoint, method = 'GET', data = null, requiresAuth = false) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (requiresAuth) {
            const token = localStorage.getItem('auth_token');
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            } else {
                throw new Error('Bạn cần đăng nhập để thực hiện thao tác này');
            }
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        // Kiểm tra lỗi HTTP
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Lỗi ${response.status}: ${response.statusText}`);
        }

        // Đối với các phản hồi NoContent
        if (response.status === 204) {
            return null;
        }

        // Phân tích cú pháp phản hồi JSON
        return await response.json();
    }

    // Auth API
    async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Đăng nhập thất bại');
        }

        return await response.json();
    }

    async register(userData) {
        return this.request('/auth/register', 'POST', userData);
    }

    async getCurrentUser() {
        return this.request('/user/me', 'GET', null, true);
    }

    // Product API
    async getProducts(page = 1, size = 12, category = null) {
        let endpoint = `/products?page=${page}&size=${size}`;
        if (category) {
            endpoint += `&category_id=${category}`;
        }
        return this.request(endpoint);
    }

    async getProduct(id) {
        return this.request(`/products/${id}`);
    }

    async getProductReviews(id) {
        return this.request(`/products/${id}/reviews`);
    }

    // Cart API
    async getCart() {
        return this.request('/cart', 'GET', null, true);
    }

    async addToCart(productId, quantity = 1, attributes = {}) {
        return this.request('/cart/items', 'POST', {
            product_id: productId,
            quantity,
            attributes
        }, true);
    }

    async updateCartItem(itemId, quantity) {
        return this.request(`/cart/items/${itemId}`, 'PATCH', {
            quantity
        }, true);
    }

    async removeCartItem(itemId) {
        return this.request(`/cart/items/${itemId}`, 'DELETE', null, true);
    }

    // Order API
    async createOrder(orderData) {
        return this.request('/orders', 'POST', orderData, true);
    }

    async getUserOrders() {
        return this.request('/orders', 'GET', null, true);
    }

    // Review API
    async createReview(productId, rating, comment) {
        return this.request('/reviews', 'POST', {
            product_id: productId,
            rating,
            comment
        }, true);
    }

    // Wishlist API
    async getWishlist() {
        return this.request('/wishlist', 'GET', null, true);
    }

    async addToWishlist(productId) {
        return this.request('/wishlist', 'POST', {
            product_id: productId
        }, true);
    }

    async removeFromWishlist(itemId) {
        return this.request(`/wishlist/${itemId}`, 'DELETE', null, true);
    }
}

const api = new Api();
export default api;