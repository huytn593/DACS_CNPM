// /frontend/assets/js/admin.js
import api from './api.js';
import auth from './auth.js';
import { renderOrdersChart, renderRevenueChart, renderTopProducts, renderInventoryStatus, renderRecentOrders } from './dashboard-ui.js';

// SCHEMA TYPEDEFS (JSDoc)
/**
 * @typedef {Object} CategoryCreate
 * @property {string} name
 * @property {string|null} description
 * @property {string|null} parent_id
 * @property {string|null} image
 */
/**
 * @typedef {Object} CategoryUpdate
 * @property {string|null} name
 * @property {string|null} description
 * @property {string|null} parent_id
 * @property {string|null} image
 */
/**
 * @typedef {Object} CategoryResponse
 * @property {string} name
 * @property {string|null} description
 * @property {string|null} parent_id
 * @property {string|null} image
 * @property {string} id
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number|null} [product_count=0]
 * @property {Array<any>|null} [subcategories=[]]
 */
/**
 * @typedef {Object} ReportCreate
 * @property {string} product_id
 * @property {string} description
 */
/**
 * @typedef {Object} ReportResponse
 * @property {string} id
 * @property {string} product_id
 * @property {string} user_id
 * @property {string} description
 * @property {string} status
 * @property {string|null} admin_notes
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string|null} product_name
 * @property {string|null} product_image
 * @property {string|null} reporter_name
 */

class Admin {
    constructor() {
        this.init();
    }

    async init() {
        if (!auth.isAuthenticated() || auth.getCurrentUser().role !== 'admin') {
            window.location.href = '../pages/login.html';
            return;
        }

        await this.loadAdminDashboard();
        this.setupEventListeners();
    }

    async loadAdminDashboard() {
        try {
            const stats = await api.getAdminStatistics();
            
            // Render các biểu đồ và thống kê
            renderOrdersChart(stats.orders_chart);
            renderRevenueChart(stats.revenue_chart);
            renderTopProducts(stats.top_products);
            renderInventoryStatus(stats.inventory_status);
            renderRecentOrders(stats.recent_orders);

            // Render thông tin tổng quan
            const overviewContainer = document.getElementById('admin-overview');
            if (overviewContainer) {
                overviewContainer.innerHTML = `
                    <div class="row">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Tổng doanh thu</h5>
                                    <h3 class="card-text">${stats.total_revenue.toLocaleString('vi-VN')}đ</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Tổng đơn hàng</h5>
                                    <h3 class="card-text">${stats.total_orders}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Tổng người dùng</h5>
                                    <h3 class="card-text">${stats.total_users}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Tổng sản phẩm</h5>
                                    <h3 class="card-text">${stats.total_products}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            alert('Không thể tải thông tin dashboard');
        }
    }

    setupEventListeners() {
        // Xử lý form thêm/sửa người dùng
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    role: formData.get('role'),
                    status: formData.get('status')
                };

                const userId = formData.get('user_id');
                try {
                    if (userId) {
                        await api.updateUser(userId, data);
                        alert('Cập nhật người dùng thành công');
                    } else {
                        await api.createUser(data);
                        alert('Thêm người dùng thành công');
                    }
                    window.location.reload();
                } catch (error) {
                    console.error('Error saving user:', error);
                    alert('Không thể lưu thông tin người dùng');
                }
            });
        }

        // Xử lý form thêm/sửa sản phẩm
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = {
                    name: formData.get('name'),
                    description: formData.get('description'),
                    price: parseFloat(formData.get('price')),
                    stock: parseInt(formData.get('stock')),
                    category: formData.get('category'),
                    status: formData.get('status')
                };

                const productId = formData.get('product_id');
                try {
                    if (productId) {
                        await api.updateProduct(productId, data);
                        alert('Cập nhật sản phẩm thành công');
                    } else {
                        await api.createProduct(data);
                        alert('Thêm sản phẩm thành công');
                    }
                    window.location.reload();
                } catch (error) {
                    console.error('Error saving product:', error);
                    alert('Không thể lưu thông tin sản phẩm');
                }
            });
        }

        // Xử lý form cập nhật trạng thái đơn hàng
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const orderId = formData.get('order_id');
                const status = formData.get('status');

                try {
                    await api.updateOrderStatus(orderId, status);
                    alert('Cập nhật trạng thái đơn hàng thành công');
                    window.location.reload();
                } catch (error) {
                    console.error('Error updating order status:', error);
                    alert('Không thể cập nhật trạng thái đơn hàng');
                }
            });
        }
    }

    async deleteUser(userId) {
        if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;

        try {
            await api.deleteUser(userId);
            alert('Xóa người dùng thành công');
            window.location.reload();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Không thể xóa người dùng');
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

const admin = new Admin();
window.admin = admin; // Make admin globally available
export default admin;