// /frontend/assets/js/user.js
import api from './api.js';
import auth from './auth.js';
import {renderOrdersChart, renderTopProducts} from "./dashboard-ui";

// SCHEMA TYPEDEFS (JSDoc)
/**
 * @typedef {Object} UserCreate
 * @property {string} email
 * @property {string} full_name
 * @property {string} username
 * @property {string} password
 * @property {string} [role="user"]
 * @property {string|null} phone
 * @property {string|null} address
 */
/**
 * @typedef {Object} UserResponse
 * @property {string} email
 * @property {string} full_name
 * @property {string} username
 * @property {string} role
 * @property {string|null} phone
 * @property {string|null} address
 * @property {string} id
 * @property {string} created_at
 * @property {string} updated_at
 */
/**
 * @typedef {Object} UserUpdate
 * @property {string|null} email
 * @property {string|null} full_name
 * @property {string|null} username
 * @property {string|null} password
 * @property {string|null} role
 * @property {string|null} phone
 * @property {string|null} address
 */

// Remove all unused definitions and methods from UserService class and the file

// Dashboard user
export async function renderUserDashboard() {
    try {
        const [orders, topProducts] = await Promise.all([
            api.getUserDashboardDailyOrders(),
            api.getUserDashboardTopProducts()
        ]);
        renderOrdersChart(orders);
        renderTopProducts(topProducts);
    } catch (error) {
        console.error('Lỗi khi tải dashboard user:', error);
    }
}

class User {
    constructor() {
        this.init();
    }

    async init() {
        if (!auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }

        await this.loadUserProfile();
        await this.loadUserDashboard();
        this.setupEventListeners();
    }

    async loadUserProfile() {
        try {
            const profile = await api.getUserProfile();
            const profileContainer = document.getElementById('user-profile');
            
            if (profileContainer) {
                profileContainer.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <div class="text-center mb-4">
                                <img src="${profile.avatar || '../assets/img/default-avatar.png'}" 
                                     class="rounded-circle" 
                                     style="width: 150px; height: 150px; object-fit: cover;"
                                     alt="Avatar">
                                <h4 class="mt-3">${profile.name}</h4>
                                <p class="text-muted">${profile.email}</p>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <h5>Thông tin cá nhân</h5>
                                    <p><strong>Email:</strong> ${profile.email}</p>
                                    <p><strong>Điện thoại:</strong> ${profile.phone}</p>
                                    <p><strong>Địa chỉ:</strong> ${profile.address}</p>
                                </div>
                                <div class="col-md-6">
                                    <h5>Thống kê</h5>
                                    <p><strong>Đơn hàng:</strong> ${profile.total_orders}</p>
                                    <p><strong>Yêu thích:</strong> ${profile.total_wishlist}</p>
                                    <p><strong>Đánh giá:</strong> ${profile.total_reviews}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            alert('Không thể tải thông tin người dùng');
        }
    }

    async loadUserDashboard() {
        try {
            const stats = await api.getUserStatistics();
            const dashboard = document.getElementById('user-dashboard');
            
            if (dashboard) {
                dashboard.innerHTML = `
                    <div class="row">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Đơn hàng</h5>
                                    <h3 class="card-text">${stats.total_orders}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Sản phẩm yêu thích</h5>
                                    <h3 class="card-text">${stats.total_wishlist}</h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Đánh giá</h5>
                                    <h3 class="card-text">${stats.total_reviews}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Đơn hàng gần đây</h5>
                                    <div class="list-group">
                                        ${stats.recent_orders.map(order => `
                                            <div class="list-group-item">
                                                <div class="d-flex w-100 justify-content-between">
                                                    <h6 class="mb-1">Đơn hàng #${order.order_number}</h6>
                                                    <small>${new Date(order.created_at).toLocaleDateString('vi-VN')}</small>
                                                </div>
                                                <p class="mb-1">${order.total_amount.toLocaleString('vi-VN')}đ</p>
                                                <small class="badge bg-${this.getStatusColor(order.status)}">${this.getStatusText(order.status)}</small>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Sản phẩm đã xem</h5>
                                    <div class="list-group">
                                        ${stats.recent_views.map(product => `
                                            <div class="list-group-item">
                                                <div class="d-flex w-100 justify-content-between">
                                                    <h6 class="mb-1">${product.name}</h6>
                                                    <small>${product.price.toLocaleString('vi-VN')}đ</small>
                                                </div>
                                                <small>Xem lần cuối: ${new Date(product.last_viewed).toLocaleDateString('vi-VN')}</small>
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
            console.error('Error loading user dashboard:', error);
            alert('Không thể tải thông tin dashboard');
        }
    }

    setupEventListeners() {
        // Xử lý form cập nhật thông tin cá nhân
        const updateForm = document.getElementById('update-profile-form');
        if (updateForm) {
            updateForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    address: formData.get('address')
                };

                try {
                    await api.updateUserProfile(data);
                    await this.loadUserProfile();
                    alert('Cập nhật thông tin thành công');
        } catch (error) {
                    console.error('Error updating user profile:', error);
                    alert('Không thể cập nhật thông tin cá nhân');
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
                    await api.uploadUserAvatar(formData);
                    await this.loadUserProfile();
                    alert('Cập nhật ảnh đại diện thành công');
        } catch (error) {
                    console.error('Error uploading avatar:', error);
                    alert('Không thể cập nhật ảnh đại diện');
                }
            });
        }
    }

    getStatusColor(status) {
        const colors = {
            pending: 'warning',
            confirmed: 'info',
            shipping: 'primary',
            completed: 'success',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            pending: 'Chờ xác nhận',
            confirmed: 'Đã xác nhận',
            shipping: 'Đang giao hàng',
            completed: 'Hoàn thành',
            cancelled: 'Đã hủy'
        };
        return texts[status] || status;
    }
}

const user = new User();
window.user = user; // Make user globally available
export default user;