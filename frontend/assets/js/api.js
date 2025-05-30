import {config} from './config.js';

// SCHEMA TYPEDEFS (JSDoc)
/**
 * @typedef {Object} Body_create_seller_product_api_seller_products_post
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
 * @typedef {Object} Body_login_api_user_login_post
 * @property {('password'|null)} grant_type
 * @property {string} username
 * @property {string} password
 * @property {string} [scope]
 * @property {string|null} client_id
 * @property {string|null} client_secret
 */
/**
 * @typedef {Object} Body_update_seller_product_api_seller_products__product_id__put
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
 * @typedef {Object} CartItem
 * @property {string} id
 * @property {string} product_id
 * @property {string} product_name
 * @property {string|null} product_image
 * @property {number} price
 * @property {number} quantity
 * @property {Object|null} attributes
 * @property {boolean} [in_stock=true]
 * @property {string} added_at
 */
/**
 * @typedef {Object} CartResponse
 * @property {CartItem[]} [items=[]]
 * @property {number} [total=0]
 * @property {number} [items_count=0]
 */

class API {
    constructor() {
        this.baseURL = 'http://localhost:8000/api/v1';
    }

    async request(endpoint, method = 'GET', data = null, requiresAuth = true) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json'
        };

        if (requiresAuth) {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Unauthorized');
            }
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'API request failed');
            }

            return result;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async login(email, password) {
        const formData = new FormData();
        formData.append('username', email);  // OAuth2 expects 'username' field
        formData.append('password', password);
        
        const url = `${this.baseURL}/auth/login`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - browser will set it automatically with boundary for FormData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Đăng nhập thất bại');
        }

        const data = await response.json();
        if (!data.access_token || !data.user) {
            throw new Error('Dữ liệu đăng nhập không hợp lệ');
        }

        return data;
    }

    async register(userData) {
        const response = await this.request('/auth/register', 'POST', userData, false);
        if (!response.access_token || !response.user) {
            throw new Error('Dữ liệu đăng ký không hợp lệ');
        }
        return response;
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', 'POST', { currentPassword, newPassword });
    }

    async forgotPassword(email) {
        return this.request('/auth/forgot-password', 'POST', { email }, false);
    }

    async resetPassword(token, newPassword) {
        return this.request('/auth/reset-password', 'POST', { token, newPassword }, false);
    }

    // User endpoints
    async getUserProfile() {
        return this.request('/users/profile');
    }

    async updateUserProfile(userData) {
        return this.request('/users/profile', 'PUT', userData);
    }

    async uploadUserAvatar(formData) {
        const url = `${this.baseURL}/users/avatar`;
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }

        return response.json();
    }

    // Product endpoints
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/products?${queryString}`, 'GET', null, false);
    }

    async getProductDetail(productId) {
        return this.request(`/products/${productId}`, 'GET', null, false);
    }

    async createProduct(productData) {
        return this.request('/products', 'POST', productData);
    }

    async updateProduct(productId, productData) {
        return this.request(`/products/${productId}`, 'PUT', productData);
    }

    async deleteProduct(productId) {
        return this.request(`/products/${productId}`, 'DELETE');
    }

    // Cart endpoints
    async getCart() {
        return this.request('/cart');
    }

    async addToCart(productId, quantity = 1) {
        if (!productId) {
            throw new Error('Product ID is required');
        }
        if (quantity < 1) {
            throw new Error('Quantity must be greater than 0');
        }
        return this.request('/cart/items', 'POST', {
            product_id: productId,
            quantity: quantity
        });
    }

    async updateCartItem(itemId, quantity) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }
        if (quantity < 1) {
            throw new Error('Quantity must be greater than 0');
        }
        return this.request(`/cart/items/${itemId}`, 'PUT', { quantity });
    }

    async removeCartItem(itemId) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }
        return this.request(`/cart/items/${itemId}`, 'DELETE');
    }

    // Alias for removeCartItem to maintain backward compatibility
    async removeFromCart(itemId) {
        return this.removeCartItem(itemId);
    }

    // Order endpoints
    async createOrder(orderData) {
        return this.request('/orders', 'POST', orderData);
    }

    async getOrders() {
        return this.request('/orders');
    }

    async getOrderDetail(orderId) {
        return this.request(`/orders/${orderId}`);
    }

    async updateOrderStatus(orderId, status) {
        return this.request(`/orders/${orderId}/status`, 'PUT', { status });
    }

    // Wishlist endpoints
    async getWishlist() {
        return this.request('/wishlist');
    }

    async addToWishlist(productId) {
        return this.request('/wishlist', 'POST', { productId });
    }

    async removeFromWishlist(wishlistItemId) {
        return this.request(`/wishlist/${wishlistItemId}`, 'DELETE');
    }

    // Review endpoints
    async createReview(productId, rating, comment) {
        return this.request('/reviews', 'POST', { productId, rating, comment });
    }

    async getProductReviews(productId) {
        return this.request(`/reviews/product/${productId}`, 'GET', null, false);
    }

    // Admin endpoints
    async getAdminStatistics() {
        return this.request('/admin/stats/site');
    }

    async getAllUsers() {
        return this.request('/admin/users');
    }

    async createUser(userData) {
        return this.request('/admin/users', 'POST', userData);
    }

    async updateUser(userId, userData) {
        return this.request(`/admin/users/${userId}`, 'PUT', userData);
    }

    async deleteUser(userId) {
        return this.request(`/admin/users/${userId}`, 'DELETE');
    }

    // Seller endpoints
    async getSellerProfile() {
        return this.request('/seller/profile');
    }

    async updateSellerProfile(sellerData) {
        return this.request('/seller/profile', 'PUT', sellerData);
    }

    async uploadSellerAvatar(formData) {
        const url = `${this.baseURL}/seller/avatar`;
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }

        return response.json();
    }

    async getSellerStatistics() {
        const [revenue, products, orders] = await Promise.all([
            this.request('/seller/stats/revenue'),
            this.request('/seller/stats/products-sold'),
            this.request('/seller/stats/top-products')
        ]);
        return { revenue, products, orders };
    }

    // Category endpoints
    async getCategories() {
        return this.request('/categories', 'GET', null, false);
    }

    // Admin Dashboard Methods
    async getAdminDashboardRevenue() {
        try {
            const response = await this.request('/admin/dashboard/revenue');
            return response;
        } catch (error) {
            console.error('Error fetching admin dashboard revenue:', error);
            throw error;
        }
    }

    async getAdminDashboardOrders() {
        try {
            const response = await this.request('/admin/dashboard/orders');
            return response;
        } catch (error) {
            console.error('Error fetching admin dashboard orders:', error);
            throw error;
        }
    }

    async getAdminDashboardUsers() {
        try {
            const response = await this.request('/admin/dashboard/users');
            return response;
        } catch (error) {
            console.error('Error fetching admin dashboard users:', error);
            throw error;
        }
    }

    async getAdminDashboardProducts() {
        try {
            const response = await this.request('/admin/dashboard/products');
            return response;
        } catch (error) {
            console.error('Error fetching admin dashboard products:', error);
            throw error;
        }
    }

    async getAdminDashboardStats() {
        try {
            const response = await this.request('/admin/dashboard/stats');
            return response;
        } catch (error) {
            console.error('Error fetching admin dashboard stats:', error);
            throw error;
        }
    }

    async getAdminReports(period = 'month') {
        try {
            const response = await this.request(`/admin/reports?period=${period}`);
            return response;
        } catch (error) {
            console.error('Error fetching admin reports:', error);
            throw error;
        }
    }

    async getAdminTopUsers() {
        try {
            const response = await this.request('/admin/reports/top-users');
            return response;
        } catch (error) {
            console.error('Error fetching admin top users:', error);
            throw error;
        }
    }

    async getAdminTopCategories() {
        try {
            const response = await this.request('/admin/reports/top-categories');
            return response;
        } catch (error) {
            console.error('Error fetching admin top categories:', error);
            throw error;
        }
    }

    // API cho seller: lấy danh sách sản phẩm của seller (mock data)
    async getSellerProducts() {
        return this.request('/seller/products');
    }

    // API cho seller: lấy danh sách đơn hàng của seller (mock data)
    async getSellerOrders(status = 'all') {
        const endpoint = status === 'all' ? '/seller/orders' : `/seller/orders?status=${status}`;
        return this.request(endpoint);
    }

    // API cho seller: lấy danh sách đánh giá sản phẩm của seller (mock data)
    async getSellerReviews() {
        return this.request('/seller/reviews');
    }

    // API cho seller: xóa sản phẩm (mock: luôn thành công)
    async deleteProduct(productId) {
        console.log('Xóa sản phẩm (mock) với id:', productId);
        return { success: true };
    }

    // API cho seller: cập nhật trạng thái đơn hàng (mock: luôn thành công)
    async updateOrderStatus(orderId, status, note) {
        console.log('Cập nhật trạng thái đơn hàng (mock) với id:', orderId, 'status:', status, 'note:', note);
        return { success: true };
    }

    // API cho admin: lấy dữ liệu biểu đồ (mock data)
    async getAdminChartData() {
        const [revenue, orders, users] = await Promise.all([
            this.request('/admin/dashboard/revenue'),
            this.request('/admin/dashboard/daily-orders'),
            this.request('/admin/dashboard/new-users')
        ]);
        return { revenue, orders, users };
    }

    // API cho admin: lấy danh sách đơn hàng gần đây (mock data)
    async getRecentOrders() {
        return this.request('/admin/orders?limit=5');
    }

    // API cho admin: lấy danh sách hoạt động (activity feed) (mock data)
    async getAdminActivities() {
        return this.request('/admin/activities');
    }

    // API cho admin: lấy thống kê tổng quan (mock data)
    async getAdminStatistics() {
        // Trả về dữ liệu mẫu (mock) cho thống kê tổng quan
        return {
            total_users: 100,
            total_orders: 50,
            total_revenue: 1000000,
            total_products: 200
        };
    }

    // Seller Product Management
    async createSellerProduct(productData) {
        const formData = new FormData();
        Object.entries(productData).forEach(([key, value]) => {
            if (key === 'images' && Array.isArray(value)) {
                value.forEach(file => formData.append('images', file));
            } else {
                formData.append(key, value);
            }
        });
        
        const url = `${this.baseURL}/seller/products`;
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create product');
        }

        return response.json();
    }

    async updateSellerProduct(productId, productData) {
        const formData = new FormData();
        Object.entries(productData).forEach(([key, value]) => {
            if (key === 'images' && Array.isArray(value)) {
                value.forEach(file => formData.append('images', file));
            } else if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        });
        
        const url = `${this.baseURL}/seller/products/${productId}`;
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update product');
        }

        return response.json();
    }

    async deleteSellerProduct(productId) {
        return this.request(`/seller/products/${productId}`, 'DELETE');
    }

    // Seller Order Management
    async updateSellerOrderStatus(orderId, status, note) {
        return this.request(`/seller/orders/${orderId}`, 'PUT', {
            status,
            notes: note
        });
    }

    // Seller Review Management
    async getSellerProductReviews(productId) {
        return this.request(`/seller/products/${productId}/reviews`);
    }

    async respondToReview(reviewId, response) {
        return this.request(`/seller/reviews/${reviewId}/respond`, 'POST', { response });
    }

    // Export các API
    async getAdminUsers() {
        return this.request('/admin/users');
    }

    async getAdminCategories() {
        return this.request('/categories');
    }

    async getAdminReports() {
        return this.request('/admin/reports');
    }

    async getAdminSettings() {
        return this.request('/admin/settings');
    }

    async getSellerDashboardData() {
        const [dailyOrders, topProducts, revenue, inventory] = await Promise.all([
            this.request('/seller/dashboard/daily-orders'),
            this.request('/seller/dashboard/top-products'),
            this.request('/seller/dashboard/revenue'),
            this.request('/seller/dashboard/inventory')
        ]);
        return { dailyOrders, topProducts, revenue, inventory };
    }
}

const api = new API();
window.api = api; // Make api globally available
export default api;