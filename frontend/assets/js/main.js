// frontend/assets/js/main.js
import authService from './auth.js';
import api from './api.js';

// Khởi tạo ứng dụng
const app = {
    init() {
        this.setupNavigation();
        this.loadCurrentPage();
    },

    // Thiết lập thanh điều hướng
    setupNavigation() {
        const authContainer = document.getElementById('auth-container');
        const cartCountElement = document.getElementById('cart-count');

        // Kiểm tra đăng nhập
        if (authService.isLoggedIn()) {
            const user = authService.getUser();

            // Cập nhật UI khi đã đăng nhập
            if (authContainer) {
                authContainer.innerHTML = `
                    <div class="dropdown">
                        <a href="#" class="nav-link dropdown-toggle">${user.full_name}</a>
                        <div class="dropdown-menu">
                            <a href="/pages/profile.html" class="dropdown-item">Tài khoản</a>
                            ${user.role === 'seller' ? '<a href="/pages/seller-dashboard.html" class="dropdown-item">Quản lý</a>' : ''}
                            ${user.role === 'admin' ? '<a href="/pages/admin-dashboard.html" class="dropdown-item">Admin</a>' : ''}
                            <a href="#" id="logout-link" class="dropdown-item">Đăng xuất</a>
                        </div>
                    </div>
                `;

                // Xử lý sự kiện đăng xuất
                document.getElementById('logout-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    authService.logout();
                });
            }

            // Lấy số lượng sản phẩm trong giỏ hàng
            if (cartCountElement) {
                this.updateCartCount();
            }
        } else {
            // UI khi chưa đăng nhập
            if (authContainer) {
                authContainer.innerHTML = `
                    <a href="/pages/login.html" class="nav-link">Đăng nhập</a>
                `;
            }

            // Hiển thị giỏ hàng = 0
            if (cartCountElement) {
                cartCountElement.textContent = '0';
            }
        }
    },

    // Cập nhật số lượng sản phẩm trong giỏ hàng
    async updateCartCount() {
        try {
            const cartCountElement = document.getElementById('cart-count');
            if (!cartCountElement) return;

            if (authService.isLoggedIn()) {
                const cart = await api.getCart();
                cartCountElement.textContent = cart.items_count || '0';
            } else {
                cartCountElement.textContent = '0';
            }
        } catch (error) {
            console.error('Không thể cập nhật số lượng giỏ hàng:', error);
        }
    },

    // Xử lý trang hiện tại
    loadCurrentPage() {
        const path = window.location.pathname;
        console.log('Current path:', path);

        // Xử lý trang đăng nhập
        if (path.includes('login.html')) {
            this.setupLoginPage();
        }

        // Xử lý trang đăng ký
        else if (path.includes('register.html')) {
            this.setupRegisterPage();
        }

        // Trang chủ / danh sách sản phẩm
        else if (path.includes('index.html') || path === '/' || path.endsWith('/frontend/') || path.endsWith('/frontend/pages/')) {
            this.setupHomePage();
        }

        // Chi tiết sản phẩm
        else if (path.includes('product-detail.html')) {
            this.setupProductDetailPage();
        }

        // Giỏ hàng
        else if (path.includes('cart.html')) {
            this.setupCartPage();
        }

        // Thanh toán
        else if (path.includes('checkout.html')) {
            this.setupCheckoutPage();
        }

        // Trang cá nhân
        else if (path.includes('profile.html')) {
            this.setupProfilePage();
        }
    },

    // Thiết lập trang đăng nhập
    setupLoginPage() {
        console.log('Setting up login page');
        const loginForm = document.getElementById('login-form');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Login form submitted');

                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                try {
                    await authService.login(username, password);
                    window.location.href = '/pages/index.html';
                } catch (error) {
                    alert('Đăng nhập thất bại: ' + error.message);
                }
            });
        } else {
            console.error('Login form not found');
        }
    },

    // Thiết lập trang đăng ký
    setupRegisterPage() {
        console.log('Setting up register page');
        const registerForm = document.getElementById('register-form');

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Register form submitted');

                const email = document.getElementById('email').value;
                const fullName = document.getElementById('full-name').value;
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                const role = document.getElementById('role').value;

                // Kiểm tra mật khẩu xác nhận
                if (password !== confirmPassword) {
                    alert('Mật khẩu xác nhận không khớp');
                    return;
                }

                try {
                    const userData = {
                        email,
                        full_name: fullName,
                        username,
                        password,
                        role
                    };

                    console.log('Sending registration data:', userData);
                    await api.register(userData);
                    alert('Đăng ký thành công! Vui lòng đăng nhập.');
                    window.location.href = '/pages/login.html';
                } catch (error) {
                    alert('Đăng ký thất bại: ' + error.message);
                }
            });
        } else {
            console.error('Register form not found');
        }
    },

    // Các hàm xử lý trang khác
    setupHomePage() {
        // Hiển thị danh sách sản phẩm
        const productsContainer = document.getElementById('products-container');
        const paginationContainer = document.getElementById('pagination-container');

        if (productsContainer) {
            this.loadProducts(productsContainer, paginationContainer);
        }
    },

    async loadProducts(container, paginationContainer, page = 1, categoryId = null) {
        try {
            container.innerHTML = '<div class="loading">Đang tải sản phẩm...</div>';

            const data = await api.getProducts(page, 12, categoryId);

            if (data.products && data.products.length > 0) {
                let html = '';

                data.products.forEach(product => {
                    html += `
                        <div class="col-3 product-card">
                            <a href="product-detail.html?id=${product.id}">
                                <div class="product-image">
                                    <img src="${product.images && product.images.length > 0 ? product.images[0] : '/assets/img/placeholder.jpg'}" alt="${product.name}">
                                </div>
                                <div class="product-info">
                                    <h3>${product.name}</h3>
                                    <div class="product-price">
                                        ${product.sale_price ? 
                                            `<span class="price-sale">${product.sale_price.toLocaleString('vi-VN')}đ</span>
                                             <span class="price-regular text-muted"><del>${product.price.toLocaleString('vi-VN')}đ</del></span>` : 
                                            `<span class="price-regular">${product.price.toLocaleString('vi-VN')}đ</span>`
                                        }
                                    </div>
                                    <div class="product-rating">
                                        ${'★'.repeat(Math.round(product.average_rating || 0))}${'☆'.repeat(5 - Math.round(product.average_rating || 0))}
                                        <span class="rating-count">(${product.review_count || 0})</span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    `;
                });

                container.innerHTML = html;

                // Render pagination
                if (paginationContainer) {
                    let paginationHtml = '<ul class="pagination-list">';

                    for (let i = 1; i <= data.pages; i++) {
                        paginationHtml += `
                            <li class="page-item ${i === page ? 'active' : ''}">
                                <a href="#" data-page="${i}" class="page-link">${i}</a>
                            </li>
                        `;
                    }

                    paginationHtml += '</ul>';
                    paginationContainer.innerHTML = paginationHtml;

                    // Add event listeners to pagination links
                    const pageLinks = paginationContainer.querySelectorAll('.page-link');
                    pageLinks.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const newPage = parseInt(e.target.dataset.page);
                            this.loadProducts(container, paginationContainer, newPage, categoryId);
                        });
                    });
                }
            } else {
                container.innerHTML = '<div class="no-products">Không có sản phẩm nào.</div>';
                if (paginationContainer) {
                    paginationContainer.innerHTML = '';
                }
            }
        } catch (error) {
            console.error('Không thể tải sản phẩm:', error);
            container.innerHTML = '<div class="error">Không thể tải sản phẩm. Vui lòng thử lại sau.</div>';
        }
    }
};

// Khởi động ứng dụng khi tài liệu đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});