import api from './api.js';
import auth from './auth.js';

// Helper: format tiền
function formatVND(num) {
    return (num || 0).toLocaleString('vi-VN') + '₫';
}

class AdminDashboard {
    constructor() {
        this.charts = {};
        this.isLoading = false;
        this.init();
    }

    // Hiển thị loading state
    showLoading() {
        this.isLoading = true;
        document.querySelectorAll('.loading-overlay').forEach(el => {
            el.style.display = 'flex';
        });
    }

    // Ẩn loading state
    hideLoading() {
        this.isLoading = false;
        document.querySelectorAll('.loading-overlay').forEach(el => {
            el.style.display = 'none';
        });
    }

    // Hiển thị thông báo lỗi
    showError(message, container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        container.prepend(errorDiv);
    }

    async init() {
        try {
            // Check admin role
            if (!auth.isAuthenticated() || !auth.isAdmin()) {
                window.location.href = '../index.html';
                return;
            }

            this.showLoading();

            // Load all dashboard data
            await Promise.all([
                this.loadStatistics(),
                this.loadCharts(),
                this.loadRecentOrders(),
                this.loadActivityFeed()
            ]);

            // Set up auto-refresh every 5 minutes
            setInterval(() => this.refreshData(), 5 * 60 * 1000);
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.', document.querySelector('.dashboard-container'));
        } finally {
            this.hideLoading();
        }
    }

    async loadStatistics() {
        const container = document.querySelector('.statistics-container');
        try {
            this.showLoading();
            const stats = await api.getAdminStatistics();
            
            // Update statistics cards
            document.getElementById('total-revenue').textContent = formatVND(stats.total_revenue);
            document.getElementById('total-orders').textContent = stats.total_orders.toLocaleString();
            document.getElementById('pending-orders').textContent = stats.pending_orders.toLocaleString();
            document.getElementById('active-sellers').textContent = stats.active_sellers.toLocaleString();
            document.getElementById('today-revenue').textContent = formatVND(stats.today_revenue);
            document.getElementById('net-profit').textContent = formatVND(stats.net_profit);
            document.getElementById('total-users').textContent = stats.total_users.toLocaleString();
            document.getElementById('total-products').textContent = stats.total_products.toLocaleString();
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showError('Không thể tải thống kê. Vui lòng thử lại sau.', container);
            // Show error state in statistics cards
            document.querySelectorAll('.stat-value').forEach(el => {
                el.textContent = '--';
            });
        } finally {
            this.hideLoading();
        }
    }

    async loadCharts() {
        const container = document.querySelector('.charts-container');
        try {
            this.showLoading();
            const data = await api.getAdminChartData();
            
            // Revenue Chart
            if (data.revenue) {
                this.createRevenueChart(data.revenue);
            }
            
            // User Distribution Chart
            if (data.users) {
                this.createUserDistributionChart(data.users);
            }
            
            // Order Status Chart
            if (data.orders) {
                this.createOrderStatusChart(data.orders);
            }
            
            // Top Products Chart
            if (data.products) {
                this.createTopProductsChart(data.products);
            }
        } catch (error) {
            console.error('Error loading charts:', error);
            this.showError('Không thể tải biểu đồ. Vui lòng thử lại sau.', container);
            // Show empty state in charts
            document.querySelectorAll('.chart-card canvas').forEach(canvas => {
                const ctx = canvas.getContext('2d');
                ctx.font = '14px Inter';
                ctx.fillStyle = '#999';
                ctx.textAlign = 'center';
                ctx.fillText('Không có dữ liệu', canvas.width / 2, canvas.height / 2);
            });
        } finally {
            this.hideLoading();
        }
    }

    createRevenueChart(data) {
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Doanh thu',
                    data: data.values,
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => this.formatCurrency(context.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    createUserDistributionChart(data) {
        const ctx = document.getElementById('user-distribution-chart').getContext('2d');
        
        if (this.charts.userDistribution) {
            this.charts.userDistribution.destroy();
        }

        this.charts.userDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Người dùng', 'Seller', 'Admin'],
                datasets: [{
                    data: [data.users, data.sellers, data.admins],
                    backgroundColor: [
                        '#1976d2',
                        '#2e7d32',
                        '#ed6c02'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createOrderStatusChart(data) {
        const ctx = document.getElementById('order-status-chart').getContext('2d');
        
        if (this.charts.orderStatus) {
            this.charts.orderStatus.destroy();
        }

        this.charts.orderStatus = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã hủy'],
                datasets: [{
                    data: [
                        data.pending,
                        data.confirmed,
                        data.shipping,
                        data.completed,
                        data.cancelled
                    ],
                    backgroundColor: [
                        '#ffc107',
                        '#0dcaf0',
                        '#0d6efd',
                        '#198754',
                        '#dc3545'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createTopProductsChart(data) {
        const ctx = document.getElementById('top-products-chart').getContext('2d');
        
        if (this.charts.topProducts) {
            this.charts.topProducts.destroy();
        }

        this.charts.topProducts = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.products.map(p => p.name),
                datasets: [{
                    label: 'Số lượng đã bán',
                    data: data.products.map(p => p.quantity),
                    backgroundColor: '#1976d2'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadRecentOrders() {
        const container = document.getElementById('recent-orders-container');
        try {
            this.showLoading();
            const orders = await api.getRecentOrders();
            const tbody = document.getElementById('recent-orders-list');
            
            if (!orders || !orders.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Không có đơn hàng gần đây</td></tr>';
                return;
            }

            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td>#${order.order_number || order.id}</td>
                    <td>${order.customer_name || 'Khách hàng'}</td>
                    <td>${formatVND(order.total_amount)}</td>
                    <td>
                        <span class="badge bg-${this.getStatusClass(order.status)}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </td>
                    <td>
                        <a href="orders.html?id=${order.id}" class="btn btn-sm btn-outline-primary">
                            Chi tiết
                        </a>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading recent orders:', error);
            this.showError('Không thể tải danh sách đơn hàng gần đây. Vui lòng thử lại sau.', container);
            document.getElementById('recent-orders-list').innerHTML = 
                '<tr><td colspan="4" class="text-center text-danger">Không thể tải dữ liệu</td></tr>';
        } finally {
            this.hideLoading();
        }
    }

    async loadActivityFeed() {
        const container = document.getElementById('activity-feed-container');
        try {
            this.showLoading();
            const activities = await api.getAdminActivities();
            const feedList = document.getElementById('activity-feed-list');
            
            if (!activities || !activities.length) {
                feedList.innerHTML = '<div class="text-center text-muted">Không có hoạt động gần đây</div>';
                return;
            }

            feedList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon bg-${this.getActivityIconColor(activity.type)}">
                        <i class="bi ${this.getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.description}</div>
                        <div class="activity-time">${this.formatTimeAgo(activity.created_at)}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading activity feed:', error);
            this.showError('Không thể tải hoạt động gần đây. Vui lòng thử lại sau.', container);
            document.getElementById('activity-feed-list').innerHTML = 
                '<div class="text-center text-danger">Không thể tải dữ liệu</div>';
        } finally {
            this.hideLoading();
        }
    }

    async refreshData() {
        if (this.isLoading) return;
        
        try {
            this.showLoading();
            await Promise.all([
                this.loadStatistics(),
                this.loadCharts(),
                this.loadRecentOrders(),
                this.loadActivityFeed()
            ]);
        } catch (error) {
            console.error('Error refreshing dashboard data:', error);
            // Don't show error message for auto-refresh
        } finally {
            this.hideLoading();
        }
    }

    // Helper methods
    formatCurrency(value) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTimeAgo(dateString) {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' năm trước';
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' tháng trước';
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' ngày trước';
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' giờ trước';
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' phút trước';
        
        return 'Vừa xong';
    }

    getStatusClass(status) {
        const statusMap = {
            'pending': 'pending',
            'confirmed': 'confirmed',
            'shipping': 'shipping',
            'completed': 'completed',
            'cancelled': 'cancelled'
        };
        return statusMap[status] || 'secondary';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'shipping': 'Đang giao',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    }

    getActivityIcon(type) {
        const iconMap = {
            'order': 'bi-cart',
            'user': 'bi-person',
            'product': 'bi-box',
            'review': 'bi-star',
            'report': 'bi-flag'
        };
        return iconMap[type] || 'bi-bell';
    }

    getActivityIconColor(type) {
        const colorMap = {
            'order': 'primary',
            'user': 'success',
            'product': 'info',
            'review': 'warning',
            'report': 'danger'
        };
        return colorMap[type] || 'secondary';
    }
}

// Initialize dashboard
const dashboard = new AdminDashboard();
window.dashboard = dashboard;

export default dashboard; 