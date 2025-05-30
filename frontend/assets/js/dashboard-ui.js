// frontend/assets/js/dashboard-ui.js

import api from './api.js';
import auth from './auth.js';
import Chart from 'chart.js/auto';

class DashboardUI {
    constructor() {
        this.init();
    }

    async init() {
        if (!auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }

        const user = auth.getCurrentUser();
        if (user.role === 'admin') {
            await this.loadAdminDashboard();
        } else if (user.role === 'seller') {
            await this.loadSellerDashboard();
        } else {
            await this.loadUserDashboard();
        }
    }

    async loadAdminDashboard() {
        try {
            const stats = await api.getAdminStatistics();
            this.renderAdminDashboard(stats);
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            alert('Không thể tải thông tin dashboard');
        }
    }

    async loadSellerDashboard() {
        try {
            const stats = await api.getSellerStatistics();
            this.renderSellerDashboard(stats);
        } catch (error) {
            console.error('Error loading seller dashboard:', error);
            alert('Không thể tải thông tin dashboard');
        }
    }

    async loadUserDashboard() {
        try {
            const stats = await api.getUserStatistics();
            this.renderUserDashboard(stats);
        } catch (error) {
            console.error('Error loading user dashboard:', error);
            alert('Không thể tải thông tin dashboard');
        }
    }

    renderAdminDashboard(stats) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;

        dashboard.innerHTML = `
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
                            <h5 class="card-title">Hoa hồng</h5>
                            <h3 class="card-text">${stats.admin_commission.toLocaleString('vi-VN')}đ</h3>
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
            </div>
        `;
    }

    renderSellerDashboard(stats) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;

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

    renderUserDashboard(stats) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;

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

const dashboardUI = new DashboardUI();
export default dashboardUI;

// Vẽ biểu đồ đơn hàng (dạng bảng đơn giản, có thể nâng cấp dùng chart.js)
export function renderOrdersChart(data) {
    const ctx = document.getElementById('orders-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Đơn hàng',
                data: data.values,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Thống kê đơn hàng'
                }
            }
        }
    });
}

// Vẽ bảng sản phẩm bán chạy
export function renderTopProducts(data) {
    const container = document.getElementById('top-products');
    if (!container) return;

    container.innerHTML = `
        <div class="list-group">
            ${data.map(product => `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${product.name}</h6>
                        <small>${product.total_sold} đã bán</small>
                    </div>
                    <p class="mb-1">${product.revenue.toLocaleString('vi-VN')}đ</p>
                    <small class="text-muted">Tồn kho: ${product.stock}</small>
                </div>
            `).join('')}
        </div>
    `;
}

// Vẽ thống kê doanh thu
export function renderRevenueChart(data) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Doanh thu',
                data: data.values,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Thống kê doanh thu'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('vi-VN') + 'đ';
                        }
                    }
                }
            }
        }
    });
}

// Vẽ thống kê tồn kho
export function renderInventoryStatus(data) {
    const container = document.getElementById('inventory-status');
    if (!container) return;

    container.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <div class="card bg-danger text-white">
                    <div class="card-body">
                        <h5 class="card-title">Hết hàng</h5>
                        <h3 class="card-text">${data.out_of_stock_count}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card bg-warning text-white">
                    <div class="card-body">
                        <h5 class="card-title">Sắp hết</h5>
                        <h3 class="card-text">${data.low_stock_count}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card bg-success text-white">
                    <div class="card-body">
                        <h5 class="card-title">Đủ hàng</h5>
                        <h3 class="card-text">${data.healthy_stock_count}</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderRecentOrders(data) {
    const container = document.getElementById('recent-orders');
    if (!container) return;

    container.innerHTML = `
        <div class="list-group">
            ${data.map(order => `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">Đơn hàng #${order.order_number}</h6>
                        <small>${new Date(order.created_at).toLocaleDateString('vi-VN')}</small>
                    </div>
                    <p class="mb-1">${order.total_amount.toLocaleString('vi-VN')}đ</p>
                    <small class="badge bg-${getStatusColor(order.status)}">${getStatusText(order.status)}</small>
                </div>
            `).join('')}
        </div>
    `;
} 