// /frontend/assets/js/seller.js
import api from './api.js';
import auth from './auth.js';
import { renderOrdersChart, renderTopProducts, renderRevenueStats, renderInventoryStats } from './dashboard-ui.js';

// SCHEMA TYPEDEFS (JSDoc)
/**
 * @typedef {Object} SellerProductCreate
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
 * @typedef {Object} SellerProductUpdate
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
 * @typedef {Object} SellerProductResponse
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

// SellerService chỉ giữ lại các method thực sự dùng
class SellerService {
    constructor() {
        this.products = [];
        this.orders = [];
    }

    async getCategories() {
        return api.getCategories();
    }

    async getProducts(page = 1, size = 10) {
        return api.getSellerProducts(page, size);
    }

    async createProduct(productData) {
        return api.createSellerProduct(productData);
    }

    async updateProduct(productId, updateData) {
        return api.updateSellerProduct(productId, updateData);
    }

    async deleteProduct(productId) {
        return api.deleteSellerProduct(productId);
    }

    async getOrders(page = 1, size = 10) {
        return api.getSellerOrders(page, size);
    }

    async updateOrderStatus(orderId, status) {
        return api.updateOrderStatus(orderId, status);
    }
}

// Dashboard seller: chỉ giữ lại hàm render thực tế dùng
export async function renderSellerDashboard() {
    try {
        const [orders, topProducts, revenue, inventory] = await Promise.all([
            api.getSellerDashboardDailyOrders(),
            api.getSellerDashboardTopProducts(),
            api.getSellerDashboardRevenue(),
            api.getSellerDashboardInventory()
        ]);
        renderOrdersChart(orders);
        renderTopProducts(topProducts);
        renderRevenueStats(revenue);
        renderInventoryStats(inventory);
    } catch (error) {
        console.error('Lỗi khi tải dashboard seller:', error);
    }
}

class Seller {
    constructor() {
        this.init();
    }

    async init() {
        if (!auth.isAuthenticated() || auth.getCurrentUser().role !== 'seller') {
            window.location.href = '../pages/login.html';
            return;
        }

        await this.loadSellerProfile();
        await this.loadSellerDashboard();
        this.setupEventListeners();
    }

    async loadSellerProfile() {
        try {
            const profile = await api.getSellerProfile();
            const profileContainer = document.getElementById('seller-profile');
            
            if (profileContainer) {
                profileContainer.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <div class="text-center mb-4">
                                <img src="${profile.avatar || '../assets/img/default-avatar.png'}" 
                                     class="rounded-circle" 
                                     style="width: 150px; height: 150px; object-fit: cover;"
                                     alt="Avatar">
                                <h4 class="mt-3">${profile.shop_name}</h4>
                                <p class="text-muted">${profile.shop_description}</p>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <h5>Thông tin cửa hàng</h5>
                                    <p><strong>Email:</strong> ${profile.email}</p>
                                    <p><strong>Điện thoại:</strong> ${profile.phone}</p>
                                    <p><strong>Địa chỉ:</strong> ${profile.address}</p>
                                </div>
                                <div class="col-md-6">
                                    <h5>Thống kê</h5>
                                    <p><strong>Sản phẩm:</strong> ${profile.total_products}</p>
                                    <p><strong>Đơn hàng:</strong> ${profile.total_orders}</p>
                                    <p><strong>Đánh giá:</strong> ${profile.average_rating.toFixed(1)}/5</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading seller profile:', error);
            alert('Không thể tải thông tin cửa hàng');
        }
    }

    async loadSellerDashboard() {
        try {
            const stats = await api.getSellerStatistics();
            const dashboard = document.getElementById('seller-dashboard');
            
            if (dashboard) {
                dashboard.innerHTML = `
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Doanh thu</h5>
                                    <h3 class="card-text">${stats.seller_revenue.toLocaleString('vi-VN')}đ</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Đơn hàng</h5>
                                    <h3 class="card-text">${stats.total_orders}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Sản phẩm</h5>
                                    <h3 class="card-text">${stats.total_products}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Đánh giá</h5>
                                    <h3 class="card-text">${stats.average_rating.toFixed(1)}/5</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Tình trạng kho</h5>
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <h6>Hết hàng</h6>
                                            <p>${stats.out_of_stock_count} sản phẩm</p>
                                        </div>
                                        <div>
                                            <h6>Sắp hết</h6>
                                            <p>${stats.low_stock_count} sản phẩm</p>
                                        </div>
                                        <div>
                                            <h6>Đủ hàng</h6>
                                            <p>${stats.healthy_stock_count} sản phẩm</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Sản phẩm bán chạy</h5>
                                    <div class="list-group">
                                        ${stats.top_products.map(product => `
                                            <div class="list-group-item">
                                                <div class="d-flex w-100 justify-content-between">
                                                    <h6 class="mb-1">${product.name}</h6>
                                                    <small>${product.total_sold} đã bán</small>
                                                </div>
                                                <small>${product.revenue.toLocaleString('vi-VN')}đ</small>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading seller dashboard:', error);
            alert('Không thể tải thông tin dashboard');
        }
    }

    setupEventListeners() {
        // Xử lý form cập nhật thông tin cửa hàng
        const updateForm = document.getElementById('update-shop-form');
        if (updateForm) {
            updateForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = {
                    shop_name: formData.get('shop_name'),
                    shop_description: formData.get('shop_description'),
                    phone: formData.get('phone'),
                    address: formData.get('address')
                };

                try {
                    await api.updateSellerProfile(data);
                    await this.loadSellerProfile();
                    alert('Cập nhật thông tin thành công');
                } catch (error) {
                    console.error('Error updating shop profile:', error);
                    alert('Không thể cập nhật thông tin cửa hàng');
                }
            });
        }

        // Xử lý upload ảnh
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('avatar', file);

                try {
                    await api.uploadSellerAvatar(formData);
                    await this.loadSellerProfile();
                    alert('Cập nhật ảnh đại diện thành công');
                } catch (error) {
                    console.error('Error uploading avatar:', error);
                    alert('Không thể cập nhật ảnh đại diện');
                }
            });
        }
    }

    async updateProduct(productId, data) {
        try {
            await api.updateProduct(productId, data);
            alert('Cập nhật sản phẩm thành công');
            window.location.reload();
        } catch (error) {
            console.error('Error updating product:', error);
            alert('Không thể cập nhật sản phẩm');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

        try {
            await api.deleteProduct(productId);
            alert('Xóa sản phẩm thành công');
            window.location.reload();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Không thể xóa sản phẩm');
        }
    }
}

const seller = new Seller();
window.seller = seller; // Make seller globally available
export default seller;