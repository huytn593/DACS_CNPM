import api from './api.js';
import auth from './auth.js';

// Helper: format tiền
function formatVND(num) {
    return (num || 0).toLocaleString('vi-VN') + '₫';
}

class SellerDashboard {
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
            // Check seller role
            if (!auth.isAuthenticated() || !auth.isSeller()) {
                window.location.href = '../index.html';
                return;
            }

            this.showLoading();

            // Load all dashboard data
            await Promise.all([
                this.loadStatistics(),
                this.loadCharts(),
                this.loadRecentOrders(),
                this.loadTopProducts()
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
            const stats = await api.getSellerStatistics();
            
            // Update statistics cards
            document.getElementById('total-revenue').textContent = formatVND(stats.revenue.total);
            document.getElementById('total-orders').textContent = stats.orders.total.toLocaleString();
            document.getElementById('pending-orders').textContent = stats.orders.pending.toLocaleString();
            document.getElementById('total-products').textContent = stats.products.total.toLocaleString();
            document.getElementById('low-stock').textContent = stats.products.low_stock.toLocaleString();
            document.getElementById('today-revenue').textContent = formatVND(stats.revenue.today);
            document.getElementById('month-revenue').textContent = formatVND(stats.revenue.month);
            document.getElementById('average-rating').textContent = stats.rating ? `${stats.rating.toFixed(1)}/5` : '0/5';
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
            const data = await api.getSellerDashboardData();
            
            // Revenue Chart
            if (data.revenue) {
                this.createRevenueChart(data.revenue);
            }
            
            // Orders Chart
            if (data.dailyOrders) {
                this.createOrdersChart(data.dailyOrders);
            }
            
            // Top Products Chart
            if (data.topProducts) {
                this.createTopProductsChart(data.topProducts);
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
                            label: (context) => formatVND(context.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatVND(value)
                        }
                    }
                }
            }
        });
    }

    createOrdersChart(data) {
        const ctx = document.getElementById('orders-chart').getContext('2d');
        
        if (this.charts.orders) {
            this.charts.orders.destroy();
        }

        this.charts.orders = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã hủy'],
                datasets: [{
                    data: [
                        data.pending || 0,
                        data.confirmed || 0,
                        data.shipping || 0,
                        data.completed || 0,
                        data.cancelled || 0
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
                labels: data.map(p => p.name),
                datasets: [{
                    label: 'Số lượng đã bán',
                    data: data.map(p => p.quantity),
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
            const orders = await api.getSellerOrders('all', 5); // Get 5 most recent orders
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

    async loadTopProducts() {
        const container = document.getElementById('top-products-container');
        try {
            this.showLoading();
            const products = await api.getSellerDashboardData().then(data => data.topProducts || []);
            const tbody = document.getElementById('top-products-list');
            
            if (!products || !products.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Không có sản phẩm nào</td></tr>';
                return;
            }

            tbody.innerHTML = products.map(product => `
                <tr>
                    <td>
                        <img src="${product.image || '../assets/img/placeholder.svg'}" 
                             alt="${product.name}"
                             class="product-thumbnail">
                        ${product.name}
                    </td>
                    <td>${formatVND(product.price)}</td>
                    <td>${product.quantity}</td>
                    <td>${formatVND(product.revenue)}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading top products:', error);
            this.showError('Không thể tải danh sách sản phẩm bán chạy. Vui lòng thử lại sau.', container);
            document.getElementById('top-products-list').innerHTML = 
                '<tr><td colspan="4" class="text-center text-danger">Không thể tải dữ liệu</td></tr>';
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
                this.loadTopProducts()
            ]);
        } catch (error) {
            console.error('Error refreshing dashboard data:', error);
            // Don't show error message for auto-refresh
        } finally {
            this.hideLoading();
        }
    }

    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'confirmed': 'info',
            'shipping': 'primary',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return statusMap[status] || 'secondary';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'shipping': 'Đang giao hàng',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    }
}

// Initialize dashboard
const dashboard = new SellerDashboard();
window.dashboard = dashboard;

export default dashboard; 