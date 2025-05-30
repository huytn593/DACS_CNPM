// frontend/assets/js/main.js
import api from './api.js';
import auth from './auth.js';

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
        const cartLink = document.querySelector('.cart-link');
        const cartContainer = document.getElementById('cart-container');

        // Hide cart for sellers, admins, and anonymous users
        const shouldShowCart = () => {
            if (!auth.isAuthenticated()) return false;
            const user = auth.user;
            return user && user.role === 'user';
        };

        // Update cart visibility
        if (cartLink) {
            cartLink.style.display = shouldShowCart() ? 'block' : 'none';
        }
        if (cartContainer) {
            cartContainer.style.display = shouldShowCart() ? 'block' : 'none';
        }

        if (auth.isAuthenticated()) {
            const user = auth.user;
            if (!user) {
                // If somehow we're authenticated but user data is missing, log out
                auth.logout();
                return;
            }

            if (authContainer) {
                const displayName = user.full_name || user.username || 'User';
                authContainer.innerHTML = `
                    <div class="dropdown">
                        <button class="btn btn-link dropdown-toggle text-dark" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-person-circle"></i>
                            ${displayName}
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                            <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person"></i> Tài khoản</a></li>
                            ${shouldShowCart() ? `
                                <li><a class="dropdown-item" href="orders.html"><i class="bi bi-bag"></i> Đơn hàng</a></li>
                                <li><a class="dropdown-item" href="wishlist.html"><i class="bi bi-heart"></i> Yêu thích</a></li>
                            ` : ''}
                            ${user.role === 'seller' ? '<li><a class="dropdown-item" href="../../pages/seller-dashboard.html"><i class="bi bi-shop"></i> Quản lý bán hàng</a></li>' : ''}
                            ${user.role === 'admin' ? '<li><a class="dropdown-item" href="../../pages/admin-dashboard.html"><i class="bi bi-gear"></i> Quản trị hệ thống</a></li>' : ''}
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="auth.logout()"><i class="bi bi-box-arrow-right"></i> Đăng xuất</a></li>
                        </ul>
                    </div>
                `;

                // Initialize Bootstrap dropdown if bootstrap is available
                if (typeof bootstrap !== 'undefined') {
                    const dropdownElement = authContainer.querySelector('.dropdown-toggle');
                    if (dropdownElement) {
                        new bootstrap.Dropdown(dropdownElement);
                    }
                } else {
                    console.warn('Bootstrap is not loaded. Dropdown menu may not work properly.');
                }
            }

            if (cartCountElement) {
                if (shouldShowCart()) {
                    this.updateCartCount();
                } else {
                    cartCountElement.textContent = '0';
                }
            }
        } else {
            if (authContainer) {
                authContainer.innerHTML = `
                    <div class="d-flex gap-2">
                        <a href="../../pages/login.html" class="btn btn-outline-primary">Đăng nhập</a>
                        <a href="../../pages/register.html" class="btn btn-primary">Đăng ký</a>
                    </div>
                `;
            }

            if (cartCountElement) {
                cartCountElement.textContent = '0';
            }
        }
    },

    // Cập nhật số lượng sản phẩm trong giỏ hàng
    async updateCartCount() {
        try {
            const cartCountElements = document.querySelectorAll('#cart-count');
            if (!cartCountElements.length) return;

            if (auth.isAuthenticated()) {
                const user = auth.user;
                if (user.role === 'admin' || user.role === 'seller') {
                    cartCountElements.forEach(element => {
                        element.textContent = '0';
                    });
                    return;
                }
                
                const cart = await api.getCart();
                const count = cart.items_count || 0;
                cartCountElements.forEach(element => {
                    element.textContent = count;
                });
            } else {
                cartCountElements.forEach(element => {
                    element.textContent = '0';
                });
            }
        } catch (error) {
            console.error('Error updating cart count:', error);
            const cartCountElements = document.querySelectorAll('#cart-count');
            cartCountElements.forEach(element => {
                element.textContent = '0';
            });
        }
    },

    // Xử lý trang hiện tại
    loadCurrentPage() {
        const path = window.location.pathname;

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
        // Trang danh mục
        else if (path.includes('categories.html')) {
            this.setupCategoriesPage();
        }
        // Admin dashboard
        else if (path.includes('admin-dashboard.html')) {
            this.setupAdminDashboardPage();
        }
        // Seller dashboard
        else if (path.includes('seller-dashboard.html')) {
            this.setupSellerDashboardPage();
        }
    },

    // Thiết lập trang đăng nhập
    setupLoginPage() {
        const loginForm = document.getElementById('login-form');
        const errorMsg = document.getElementById('login-error');

        if (loginForm) {
            // Kiểm tra nếu đã đăng nhập thì chuyển hướng
            if (auth.isAuthenticated()) {
                window.location.href = 'index.html';
                return;
            }

            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Ẩn thông báo lỗi cũ
                if (errorMsg) errorMsg.style.display = 'none';

                // Lấy dữ liệu từ form
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                try {
                    await auth.login(username, password);
                    window.location.href = 'index.html';
                } catch (error) {
                    if (errorMsg) {
                        errorMsg.textContent = error.message;
                    errorMsg.style.display = 'block';
                    }
                }
            });
        }
    },

    // Thiết lập trang đăng ký
    setupRegisterPage() {
        const registerForm = document.getElementById('register-form');
        const errorMsg = document.getElementById('register-error');

        if (registerForm) {
            // Kiểm tra nếu đã đăng nhập thì chuyển hướng
            if (auth.isAuthenticated()) {
                window.location.href = 'index.html';
                return;
            }

            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Ẩn thông báo lỗi cũ
                if (errorMsg) errorMsg.style.display = 'none';

                // Lấy dữ liệu từ form
                const username = document.getElementById('username').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                const fullName = document.getElementById('full-name').value;

                // Kiểm tra mật khẩu
                if (password !== confirmPassword) {
                    if (errorMsg) {
                        errorMsg.textContent = 'Mật khẩu không khớp';
                    errorMsg.style.display = 'block';
                    }
                    return;
                }

                try {
                    await auth.register({
                        username,
                        email,
                        password,
                        full_name: fullName
                    });
                    window.location.href = 'index.html';
                } catch (error) {
                    if (errorMsg) {
                        errorMsg.textContent = error.message;
                    errorMsg.style.display = 'block';
                    }
                }
            });
        }
    },

    // Thiết lập trang chủ
    setupHomePage() {
        const productsContainer = document.getElementById('products-container');
        const paginationContainer = document.getElementById('pagination-container');
        const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        const categoriesContainer = document.getElementById('categories-container');
        const cartContainer = document.getElementById('cart-container');
        const cartLink = document.querySelector('.cart-link');
        const cartCountElement = document.getElementById('cart-count');

        // Hide cart for non-users
        const shouldShowCart = () => {
            if (!auth.isAuthenticated()) return false;
            const user = auth.user;
            return user && user.role === 'user';
        };

        // Update cart visibility
        if (cartContainer) {
            cartContainer.style.display = shouldShowCart() ? 'block' : 'none';
        }
        if (cartLink) {
            cartLink.style.display = shouldShowCart() ? 'block' : 'none';
        }
        if (cartCountElement) {
            cartCountElement.style.display = shouldShowCart() ? 'block' : 'none';
        }

        // Load danh mục động
        if (categoriesContainer) {
            this.loadCategories(categoriesContainer, productsContainer, paginationContainer);
        }

        // Load sản phẩm động
        if (productsContainer && paginationContainer) {
            this.loadProducts(productsContainer, paginationContainer, 1, null, null);
        }

        // Render sản phẩm gợi ý
        this.loadSuggestedProducts(document.getElementById('suggested-products'));

        // Xử lý tìm kiếm
        if (searchForm && searchInput) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const searchQuery = searchInput.value.trim();
                this.loadProducts(productsContainer, paginationContainer, 1, null, searchQuery);
            });
        }
    },

    // Render danh mục với icon động
    async loadCategories(categoriesContainer, productsContainer, paginationContainer) {
        try {
            const categories = await api.getCategories();
            if (!categories || !categories.length) {
                categoriesContainer.innerHTML = '<p class="text-center">Không có danh mục nào</p>';
                return;
            }

            // Get category ID from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            const selectedCategoryId = urlParams.get('category_id');

            categoriesContainer.innerHTML = `
                <div class="categories-list">
                    ${categories.map(category => `
                        <div class="category-item ${category.id === selectedCategoryId ? 'active' : ''}" 
                             onclick="app.loadProducts(document.getElementById('products-container'), 
                                     document.getElementById('pagination'), 1, '${category.id}')">
                            <i class="bi ${this.getCategoryIcon(category.name)}"></i>
                            <h3>${category.name}</h3>
                            ${category.description ? `<p>${category.description}</p>` : ''}
                            <span class="product-count">${category.product_count || 0} sản phẩm</span>
                        </div>
                    `).join('')}
                </div>
            `;

            // Load products for selected category or first category
            const categoryId = selectedCategoryId || (categories[0]?.id);
            if (categoryId) {
                await this.loadProducts(productsContainer, paginationContainer, 1, categoryId);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            categoriesContainer.innerHTML = '<p class="text-center text-danger">Không thể tải danh mục sản phẩm</p>';
        }
    },

    // Helper method to get category icon
    getCategoryIcon(categoryName) {
        const iconMap = {
            'Điện thoại': 'bi-phone',
            'Laptop': 'bi-laptop',
            'Máy tính bảng': 'bi-tablet',
            'Phụ kiện': 'bi-headphones',
            'Đồng hồ': 'bi-watch',
            'default': 'bi-tag'
        };

        // Convert to lowercase for case-insensitive matching
        const name = categoryName.toLowerCase();
        for (const [key, icon] of Object.entries(iconMap)) {
            if (name.includes(key.toLowerCase())) {
                return icon;
            }
        }
        return iconMap.default;
    },

    // Render sản phẩm gợi ý (random hoặc bán chạy)
    async loadSuggestedProducts(container) {
        try {
            const res = await api.getProducts(1, 20);
            let items = res.items || [];
            items = items.sort(() => Math.random() - 0.5).slice(0, 6);
            container.innerHTML = items.map(p => `
                <div class="product-card">
                    <img src="${getImageUrl(p.images?.[0])}" 
                         alt="${p.name}"
                         onerror="this.src='../assets/img/placeholder.svg'">
                    <div class="card-body">
                        <div class="card-title">${p.name}</div>
                        <div class="card-price">${(p.price || 0).toLocaleString('vi-VN')}₫</div>
                        <a href="product-detail.html?id=${p.id}" class="btn btn-dark btn-action mt-2">Xem chi tiết</a>
                    </div>
                </div>
            `).join('');
                } catch (error) {
            console.error('Error loading suggested products:', error);
            container.innerHTML = '<p class="error">Không thể tải sản phẩm gợi ý</p>';
        }
    },

    // Thiết lập trang chi tiết sản phẩm
    setupProductDetailPage() {
        const productContainer = document.getElementById('product-detail');
        const reviewsContainer = document.getElementById('product-reviews');
        const reviewForm = document.getElementById('review-form');

        if (productContainer) {
        // Lấy ID sản phẩm từ URL
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

            if (productId) {
                // Load thông tin sản phẩm
                this.loadProductDetail(productId, productContainer);

                // Load đánh giá sản phẩm
        if (reviewsContainer) {
                    this.loadProductReviews(productId, reviewsContainer);
        }

                // Thiết lập form đánh giá
        if (reviewForm) {
            this.setupReviewForm(reviewForm, productId);
        }
            } else {
                productContainer.innerHTML = '<p class="error">Không tìm thấy sản phẩm</p>';
            }
        }
    },

    // Thiết lập trang giỏ hàng
    setupCartPage() {
        const cartContainer = document.getElementById('cart-items');
        const summaryContainer = document.getElementById('cart-summary');

        if (cartContainer && summaryContainer) {
            this.loadCart(cartContainer, summaryContainer);
        }
    },

    // Thiết lập trang thanh toán
    setupCheckoutPage() {
        const checkoutContainer = document.getElementById('checkout-form');

        if (checkoutContainer) {
            this.loadCheckoutForm(checkoutContainer);
        }
    },

    // Thiết lập trang cá nhân
    setupProfilePage() {
        const profileContainer = document.getElementById('profile-container');
        const ordersContainer = document.getElementById('orders-container');
        const wishlistContainer = document.getElementById('wishlist-container');

        if (profileContainer) {
            this.loadUserProfile();
        }

        if (ordersContainer) {
            this.loadUserOrders();
        }

        if (wishlistContainer) {
                    this.loadUserWishlist();
                }
    },

    // Thiết lập trang danh mục
    setupCategoriesPage() {
        const categoriesContainer = document.getElementById('categories-container');
        const productsContainer = document.getElementById('products-container');
        const paginationContainer = document.getElementById('pagination');

        if (categoriesContainer && productsContainer && paginationContainer) {
            this.loadCategories(categoriesContainer, productsContainer, paginationContainer);
        }
    },

    // Thiết lập trang admin dashboard
    setupAdminDashboardPage() {
        // Kiểm tra quyền admin
        if (!auth.isAuthenticated() || auth.user.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }

        // Load thống kê
        this.loadAdminStatistics();
    },

    // Thiết lập trang seller dashboard
    setupSellerDashboardPage() {
        // Kiểm tra quyền seller
        if (!auth.isAuthenticated() || auth.user.role !== 'seller') {
            window.location.href = 'index.html';
            return;
        }

        // Load thống kê
        this.loadSellerStatistics();
    },

    // Load danh sách sản phẩm
    async loadProducts(container, paginationContainer, page = 1, categoryId = null, searchQuery = null) {
        try {
            const response = await api.getProducts(page, 12, categoryId, searchQuery);
            const products = response.items || [];

            container.innerHTML = products.map(product => {
                const imageUrl = getImageUrl(product.images);
                return `
                    <div class="product-card" data-product-id="${product.id}" style="cursor:pointer;">
                                <div class="product-image">
                            ${imageUrl ? `<img src="${imageUrl}" alt="${product.name}" onerror="this.style.display='none'">` : ''}
                            <div class="product-overlay">
                                <div class="product-info">
                                    <h3 class="product-name">${product.name}</h3>
                                    <p class="product-price">${product.price.toLocaleString('vi-VN')}đ</p>
                                    <button class="btn btn-outline-light btn-sm compare-btn" 
                                            data-compare-id="${product.id}">
                                        <i class="bi bi-arrow-left-right"></i> So sánh sản phẩm
                                    </button>
                                    </div>
                                    </div>
                                </div>
                        </div>
                    `;
            }).join('');

            // Add event delegation for product card click and compare button
            container.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', function(e) {
                    // If the compare button was clicked, do not navigate
                    if (e.target.closest('.compare-btn')) return;
                    const productId = this.getAttribute('data-product-id');
                    if (productId) {
                        window.location.href = `product-detail.html?id=${productId}`;
                    }
                });
                // Compare button handler
                const compareBtn = card.querySelector('.compare-btn');
                if (compareBtn) {
                    compareBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        app.compareProduct(this.getAttribute('data-compare-id'));
                    });
                }
            });

            // Render phân trang
                if (paginationContainer) {
                const totalPages = response.total_pages || 1;
                let paginationHTML = '';

                // Nút Previous
                paginationHTML += `
                    <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} 
                            onclick="app.loadProducts(document.getElementById('products-container'), 
                            document.getElementById('pagination'), ${page - 1})">
                        Trước
                    </button>
                `;

                // Các nút số trang
                for (let i = 1; i <= totalPages; i++) {
                    paginationHTML += `
                        <button class="pagination-btn ${i === page ? 'active' : ''}" 
                                onclick="app.loadProducts(document.getElementById('products-container'), 
                                document.getElementById('pagination'), ${i})">
                            ${i}
                        </button>
                    `;
                }

                // Nút Next
                paginationHTML += `
                    <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} 
                            onclick="app.loadProducts(document.getElementById('products-container'), 
                            document.getElementById('pagination'), ${page + 1})">
                        Sau
                    </button>
                `;

                paginationContainer.innerHTML = paginationHTML;
            }
        } catch (error) {
            container.innerHTML = '<p class="error">Không thể tải danh sách sản phẩm</p>';
        }
    },

    // Load chi tiết sản phẩm
    async loadProductDetail(productId, container) {
        try {
            const product = await api.getProductDetail(productId);
            if (!product) {
                container.innerHTML = '<p class="error">Không tìm thấy sản phẩm</p>';
                return;
            }

            const productImages = Array.isArray(product.images)
                ? product.images.filter(img => typeof img === 'string').map(img => getImageUrl(img))
                : [];
            const mainImage = productImages.length > 0 ? productImages[0] : '';
            const thumbnails = productImages.length > 1 ? productImages.slice(1) : [];
            const showGallery = thumbnails.length > 0;

                container.innerHTML = `
                <div class="product-detail">
                    <div class="product-images">
                        <div class="product-image">
                            ${mainImage ? `<img src="${mainImage}" alt="${product.name}" onerror="this.style.display='none'">` : ''}
                        </div>
                        ${showGallery ? `
                            <div class="thumbnail-images">
                                ${thumbnails.map(image => `
                                    <img src="${image}" alt="${product.name}" onerror="this.style.display='none'"
                                         onclick="this.parentElement.parentElement.querySelector('.product-image img').src = '${image}'">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="product-info">
                        <h1 class="product-name">${product.name}</h1>
                        <p class="product-price">${product.price.toLocaleString('vi-VN')}đ</p>
                        <p class="product-description">${product.description || 'Chưa có mô tả'}</p>
                        <div class="product-meta">
                            <p>Danh mục: ${product.category_name || 'Chưa phân loại'}</p>
                            <p>Người bán: ${product.seller_name || 'Chưa xác định'}</p>
                            <p>Đánh giá: ${product.average_rating || 0}/5 (${product.review_count || 0} đánh giá)</p>
                        </div>
                        <div class="product-actions">
                            <div class="quantity-selector">
                                <button onclick="this.parentElement.querySelector('input').stepDown()">-</button>
                                <input type="number" value="1" min="1" max="${product.stock || 0}">
                                <button onclick="this.parentElement.querySelector('input').stepUp()">+</button>
                            </div>
                            <button class="btn btn-primary" onclick="app.addToCart('${product.id}', this.parentElement.querySelector('.quantity-selector input').value)">
                                Thêm vào giỏ
                            </button>
                            <button class="btn btn-outline" onclick="app.buyNow('${product.id}', this.parentElement.querySelector('.quantity-selector input').value)">
                                Mua ngay
                            </button>
                            <button class="btn btn-outline-secondary" onclick="app.compareProduct('${product.id}')">
                                <i class="bi bi-arrow-left-right"></i> So sánh sản phẩm
                            </button>
                        </div>
                        </div>
                    </div>
                `;
                        } catch (error) {
            console.error('Error loading product detail:', error);
            container.innerHTML = '<p class="error">Không thể tải thông tin sản phẩm</p>';
        }
    },

    // Load đánh giá sản phẩm
    async loadProductReviews(productId, container) {
        try {
            const reviews = await api.getProductReviews(productId);

            container.innerHTML = `
                <h2>Đánh giá sản phẩm</h2>
                <div class="reviews-list">
                    ${reviews.map(review => `
                        <div class="review-item">
                            <div class="review-header">
                                <span class="reviewer-name">${review.user_name}</span>
                                <span class="review-date">${new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div class="review-rating">
                                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                            </div>
                            <p class="review-comment">${review.comment || 'Không có nhận xét'}</p>
                        </div>
                    `).join('')}
                        </div>
                    `;
        } catch (error) {
            container.innerHTML = '<p class="error">Không thể tải đánh giá sản phẩm</p>';
        }
    },

    // Thiết lập form đánh giá
    setupReviewForm(form, productId) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const rating = form.querySelector('input[name="rating"]').value || 0;
            const comment = form.querySelector('textarea[name="comment"]').value || '';

            try {
                await api.createReview(productId, rating, comment);
                // Reload đánh giá
                const reviewsContainer = document.getElementById('product-reviews');
                if (reviewsContainer) {
                    await this.loadProductReviews(productId, reviewsContainer);
                }
                // Reset form
                form.reset();
            } catch (error) {
                const errorMsg = form.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.textContent = error.message;
                    errorMsg.style.display = 'block';
                }
            }
        });
    },

    // Load giỏ hàng
    async loadCart(cartContainer, summaryContainer) {
        try {
            const cart = await api.getCart();

            // Render danh sách sản phẩm trong giỏ hàng
            cartContainer.innerHTML = `
                <div class="cart-items">
                    ${cart.items.map(item => `
                        <div class="cart-item card mb-3">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col-md-2">
                                        <img src="${getImageUrl(item.product_image)}" 
                                             alt="${item.product_name}"
                                             class="img-fluid rounded"
                                             onerror="this.src='../assets/img/placeholder.svg'">
                            </div>
                                    <div class="col-md-4">
                                        <h5 class="card-title mb-1">
                                            <a href="product-detail.html?id=${item.product_id}" class="text-decoration-none">
                                                ${item.product_name}
                                            </a>
                                        </h5>
                                        <p class="text-muted mb-0">Đơn giá: ${item.price.toLocaleString('vi-VN')}đ</p>
                                </div>
                                    <div class="col-md-3">
                                        <div class="input-group">
                                            <button class="btn btn-outline-secondary" type="button" 
                                                    onclick="app.updateCartItem('${item.id}', this.parentElement.querySelector('input').value - 1)">
                                                <i class="bi bi-dash"></i>
                                            </button>
                                            <input type="number" class="form-control text-center" 
                                                   value="${item.quantity}" min="1" 
                                                   onchange="app.updateCartItem('${item.id}', this.value)">
                                            <button class="btn btn-outline-secondary" type="button"
                                                    onclick="app.updateCartItem('${item.id}', this.parentElement.querySelector('input').value + 1)">
                                                <i class="bi bi-plus"></i>
                                            </button>
                            </div>
                                </div>
                                    <div class="col-md-2 text-end">
                                        <p class="fw-bold mb-0">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
                            </div>
                                    <div class="col-md-1 text-end">
                                        <button class="btn btn-link text-danger p-0" 
                                                onclick="app.removeCartItem('${item.id}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                            </div>
                            </div>
                            </div>
                        </div>
                    `).join('')}
                        </div>
                    `;

            // Render tổng quan giỏ hàng
                summaryContainer.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title mb-4">Tổng quan đơn hàng</h5>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Tạm tính:</span>
                            <span class="fw-bold">${cart.total.toLocaleString('vi-VN')}đ</span>
                    </div>
                        <div class="d-flex justify-content-between mb-2">
                        <span>Phí vận chuyển:</span>
                            <span class="fw-bold">30.000đ</span>
                    </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-4">
                            <span class="h5 mb-0">Tổng cộng:</span>
                            <span class="h5 mb-0 text-danger">${(cart.total + 30000).toLocaleString('vi-VN')}đ</span>
                    </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary" onclick="window.location.href='checkout.html'">
                                Tiến hành thanh toán
                            </button>
                            <button class="btn btn-outline-secondary" onclick="window.location.href='index.html'">
                                Tiếp tục mua sắm
                            </button>
                        </div>
                    </div>
                    </div>
                `;
        } catch (error) {
            cartContainer.innerHTML = '<p class="error">Không thể tải giỏ hàng</p>';
            summaryContainer.innerHTML = '';
        }
    },

    // Load form thanh toán
    async loadCheckoutForm(container) {
        try {
            const cart = await api.getCart();
            const user = auth.user;

                container.innerHTML = `
                <form id="checkout-form" class="checkout-form">
                                <div class="form-group">
                                    <label for="full-name">Họ tên</label>
                        <input type="text" id="full-name" value="${user.full_name}" required>
                                </div>
                                <div class="form-group">
                                    <label for="phone">Số điện thoại</label>
                        <input type="tel" id="phone" value="${user.phone || ''}" required>
                                </div>
                                <div class="form-group">
                        <label for="address">Địa chỉ giao hàng</label>
                        <textarea id="address" required>${user.address || ''}</textarea>
                                </div>
                                <div class="form-group">
                        <label for="payment-method">Phương thức thanh toán</label>
                        <select id="payment-method" required>
                            <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                            <option value="BANK">Chuyển khoản ngân hàng</option>
                        </select>
                                </div>
                    <div class="order-summary">
                        <h3>Tổng quan đơn hàng</h3>
                        <div class="summary-row">
                            <span>Tạm tính:</span>
                                <span>${cart.total.toLocaleString('vi-VN')}đ</span>
                            </div>
                        <div class="summary-row">
                                <span>Phí vận chuyển:</span>
                            <span>30.000đ</span>
                            </div>
                        <div class="summary-row total">
                            <span>Tổng cộng:</span>
                            <span>${(cart.total + 30000).toLocaleString('vi-VN')}đ</span>
                            </div>
                        </div>
                    <button type="submit" class="btn btn-primary">Đặt hàng</button>
                </form>
            `;

            // Xử lý submit form
            const form = document.getElementById('checkout-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                    const orderData = {
                    shipping_address: document.getElementById('address').value,
                    phone_number: document.getElementById('phone').value,
                    payment_method: document.getElementById('payment-method').value,
                    items: cart.items.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: item.price
                    }))
                };

                try {
                    await api.createOrder(orderData);
                    window.location.href = 'profile.html';
                        } catch (error) {
                    const errorMsg = form.querySelector('.error-message');
                    if (errorMsg) {
                        errorMsg.textContent = error.message;
                        errorMsg.style.display = 'block';
                            }
                        }
                    });
        } catch (error) {
            container.innerHTML = '<p class="error">Không thể tải form thanh toán</p>';
        }
    },

    // Load thông tin người dùng
    async loadUserProfile() {
        try {
        const profileContainer = document.getElementById('profile-container');
        if (!profileContainer) return;

            const user = auth.user;
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            profileContainer.innerHTML = `
                <div class="profile-info">
                    <h2>Thông tin cá nhân</h2>
                    <form id="profile-form" class="profile-form">
                                <div class="form-group">
                            <label for="username">Tên đăng nhập</label>
                            <input type="text" id="username" value="${user.username}" disabled>
                                </div>
                                <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" value="${user.email}" disabled>
                                </div>
                                <div class="form-group">
                        <label for="full-name">Họ tên</label>
                            <input type="text" id="full-name" value="${user.full_name}" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Số điện thoại</label>
                            <input type="tel" id="phone" value="${user.phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="address">Địa chỉ</label>
                            <textarea id="address">${user.address || ''}</textarea>
                                </div>
                        <button type="submit" class="btn btn-primary">Cập nhật</button>
                </form>
                            </div>
            `;

            // Xử lý submit form
            const form = document.getElementById('profile-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const profileData = {
                    full_name: document.getElementById('full-name').value,
                    phone: document.getElementById('phone').value,
                    address: document.getElementById('address').value
                };

                try {
                    await api.updateProfile(profileData);
                    alert('Cập nhật thông tin thành công');
                } catch (error) {
                    alert(error.message);
                }
            });
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    },

    // Load danh sách đơn hàng của người dùng
    async loadUserOrders() {
        try {
            const ordersContainer = document.getElementById('orders-container');
            if (!ordersContainer) return;

            const orders = await api.getOrders();
            if (!orders || !orders.length) {
                ordersContainer.innerHTML = '<p class="text-center">Bạn chưa có đơn hàng nào</p>';
                return;
            }

            ordersContainer.innerHTML = `
                <div class="orders-list">
                    ${orders.map(order => `
                        <div class="card mb-3">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <span class="order-number">#${order.order_number || order.id}</span>
                                <span class="order-date">${new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                                <span class="badge bg-${this.getStatusBadgeColor(order.status)}">${this.getStatusText(order.status)}</span>
                            </div>
                            <div class="card-body">
                                <div class="order-items">
                                    ${order.items.map(item => `
                                        <div class="d-flex align-items-center mb-2">
                                            <img src="${getImageUrl(item.product_image)}" 
                                                 alt="${item.product_name}"
                                                 class="img-thumbnail me-3"
                                                 style="width: 80px; height: 80px; object-fit: cover;">
                                            <div class="flex-grow-1">
                                                <h6 class="mb-0">${item.product_name}</h6>
                                                <p class="mb-0">Số lượng: ${item.quantity}</p>
                                                <p class="mb-0">Giá: ${item.price.toLocaleString('vi-VN')}đ</p>
                    </div>
                                    </div>
                                    `).join('')}
                                        </div>
                                <div class="order-total mt-3 text-end">
                                    <strong>Tổng cộng: ${order.total_amount.toLocaleString('vi-VN')}đ</strong>
                                    </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
            `;
        } catch (error) {
            console.error('Error loading user orders:', error);
            const ordersContainer = document.getElementById('orders-container');
            if (ordersContainer) {
                ordersContainer.innerHTML = '<p class="text-center text-danger">Không thể tải danh sách đơn hàng</p>';
            }
        }
    },

    // Load danh sách yêu thích của người dùng
    async loadUserWishlist() {
        try {
            const wishlistContainer = document.getElementById('wishlist-container');
            if (!wishlistContainer) return;

            const wishlist = await api.getWishlist();
            if (!wishlist || !wishlist.length) {
                wishlistContainer.innerHTML = '<p class="text-center">Danh sách yêu thích của bạn đang trống</p>';
                return;
            }

            wishlistContainer.innerHTML = `
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                    ${wishlist.map(item => `
                        <div class="col">
                            <div class="card h-100">
                                <img src="${getImageUrl(item.product_image)}" 
                                     class="card-img-top"
                                     alt="${item.product_name}"
                                     style="height: 200px; object-fit: cover;">
                                <div class="card-body">
                                    <h5 class="card-title">${item.product_name}</h5>
                                    <p class="card-text text-danger fw-bold">
                                        ${item.product_price.toLocaleString('vi-VN')}đ
                                    </p>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary" 
                                                onclick="app.addToCart('${item.product_id}')">
                                            Thêm vào giỏ
                                        </button>
                                        <button class="btn btn-outline-danger" 
                                                onclick="app.removeFromWishlist('${item.id}')">
                                            Xóa khỏi danh sách
                                        </button>
                            </div>
                            </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
                } catch (error) {
            console.error('Error loading user wishlist:', error);
            const wishlistContainer = document.getElementById('wishlist-container');
            if (wishlistContainer) {
                wishlistContainer.innerHTML = '<p class="text-center text-danger">Không thể tải danh sách yêu thích</p>';
            }
        }
    },

    // Helper method to get status badge color
    getStatusBadgeColor(status) {
        const colorMap = {
            'pending': 'warning',
            'confirmed': 'info',
            'shipping': 'primary',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return colorMap[status] || 'secondary';
    },

    // Helper method to get status text
    getStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xác nhận',
            'confirmed': 'Đã xác nhận',
            'shipping': 'Đang giao hàng',
            'completed': 'Hoàn thành',
            'cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    },

    // Mua ngay
    async buyNow(productId, quantity = 1) {
        if (!auth.isAuthenticated()) {
            if (confirm('Bạn cần đăng nhập để mua hàng. Đăng nhập ngay?')) {
                window.location.href = 'login.html';
            }
                    return;
                }
        try {
            await api.addToCart(productId, quantity);
            window.location.href = 'checkout.html';
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    },

    // Thêm vào giỏ hàng
    async addToCart(productId, quantity = 1) {
        if (!auth.isAuthenticated()) {
            if (confirm('Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?')) {
                window.location.href = 'login.html';
            }
                    return;
                }
        try {
            await api.addToCart(productId, quantity);
            await this.updateCartCount();
            alert('Đã thêm vào giỏ hàng');
                } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    },

    // Cập nhật số lượng sản phẩm trong giỏ hàng
    async updateCartItem(itemId, quantity) {
        try {
            if (quantity < 1) return;
            await api.updateCartItem(itemId, quantity);
            await this.loadCart(
                document.getElementById('cart-items'),
                document.getElementById('cart-summary')
            );
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    },

    // Xóa sản phẩm khỏi giỏ hàng
    async removeCartItem(itemId) {
        try {
            await api.removeCartItem(itemId);
            await this.loadCart(
                document.getElementById('cart-items'),
                document.getElementById('cart-summary')
            );
                } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    },

    // Xóa khỏi danh sách yêu thích
    async removeFromWishlist(productId) {
        try {
            await api.removeFromWishlist(productId);
            await this.loadUserWishlist();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    },

    // Stub for unresolved functions
    async loadAdminStatistics() { /* TODO: Implement admin statistics loading */ },
    async loadSellerStatistics() { /* TODO: Implement seller statistics loading */ },
    async getProductReviews(productId) { return []; },
    async createReview(productId, rating, comment) { return null; },
    async getOrders() { return []; },

    // Add comparison state management
    comparisonState: {
        products: [],
        maxProducts: 3,
        
        addProduct(product) {
            if (this.products.length >= this.maxProducts) {
                alert(`Bạn chỉ có thể so sánh tối đa ${this.maxProducts} sản phẩm`);
                return false;
            }
            if (this.products.some(p => p.id === product.id)) {
                alert('Sản phẩm này đã được thêm vào danh sách so sánh');
                return false;
            }
            this.products.push(product);
            this.updateComparisonUI();
            return true;
        },
        
        removeProduct(productId) {
            this.products = this.products.filter(p => p.id !== productId);
            this.updateComparisonUI();
        },
        
        clearProducts() {
            this.products = [];
            this.updateComparisonUI();
        },
        
        async updateComparisonUI() {
            const comparisonContainer = document.getElementById('comparison-container');
            if (!comparisonContainer) return;

            if (this.products.length === 0) {
                comparisonContainer.style.display = 'none';
                return;
            }

            comparisonContainer.style.display = 'block';
            comparisonContainer.innerHTML = `
                <div class="comparison-bar">
                    <div class="comparison-items">
                        ${this.products.map(product => `
                            <div class="comparison-item">
                                <img src="${getImageUrl(product.images?.[0])}" alt="${product.name}">
                                <span>${product.name}</span>
                                <button onclick="app.removeFromComparison('${product.id}')" class="btn-remove">
                                    <i class="bi bi-x"></i>
                                </button>
                    </div>
                        `).join('')}
                    </div>
                    <div class="comparison-actions">
                        <button class="btn btn-primary" onclick="app.showComparison()">
                            So sánh (${this.products.length}/${this.maxProducts})
                        </button>
                        <button class="btn btn-outline" onclick="app.clearComparison()">
                            Xóa tất cả
                        </button>
                    </div>
                    </div>
            `;
        }
    },

    // Update the compareProduct method
    async compareProduct(productId) {
        try {
            const product = await api.getProductDetail(productId);
            if (!product) {
                alert('Không thể tải thông tin sản phẩm');
                return;
            }

            if (this.comparisonState.addProduct(product)) {
                // Add comparison container if it doesn't exist
                let comparisonContainer = document.getElementById('comparison-container');
                if (!comparisonContainer) {
                    comparisonContainer = document.createElement('div');
                    comparisonContainer.id = 'comparison-container';
                    document.body.appendChild(comparisonContainer);
                }
            }
        } catch (error) {
            console.error('Error adding product to comparison:', error);
            alert('Không thể thêm sản phẩm vào danh sách so sánh');
        }
    },

    // Add comparison UI methods
    async showComparison() {
        if (this.comparisonState.products.length < 2) {
            alert('Cần ít nhất 2 sản phẩm để so sánh');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">So sánh sản phẩm</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                    <div class="modal-body">
                        <div class="comparison-table">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Tính năng</th>
                                        ${this.comparisonState.products.map(p => `
                                            <th>${p.name}</th>
                                        `).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Hình ảnh</td>
                                        ${this.comparisonState.products.map(p => `
                                            <td>
                                                <img src="${getImageUrl(p.images?.[0])}" 
                                                     alt="${p.name}"
                                                     style="max-width: 150px;">
                                            </td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td>Giá</td>
                                        ${this.comparisonState.products.map(p => `
                                            <td>${p.price.toLocaleString('vi-VN')}đ</td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td>Danh mục</td>
                                        ${this.comparisonState.products.map(p => `
                                            <td>${p.category_name || 'Chưa phân loại'}</td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td>Người bán</td>
                                        ${this.comparisonState.products.map(p => `
                                            <td>${p.seller_name || 'Chưa xác định'}</td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td>Đánh giá</td>
                                        ${this.comparisonState.products.map(p => `
                                            <td>${p.average_rating || 0}/5 (${p.review_count || 0} đánh giá)</td>
                                        `).join('')}
                                    </tr>
                                    <tr>
                                        <td>Mô tả</td>
                                        ${this.comparisonState.products.map(p => `
                                            <td>${p.description || 'Chưa có mô tả'}</td>
                                        `).join('')}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        </div>
                        </div>
                </div>
            `;

        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    },

    removeFromComparison(productId) {
        this.comparisonState.removeProduct(productId);
    },

    clearComparison() {
        this.comparisonState.clearProducts();
    }
};

// Khởi tạo ứng dụng
    app.init();

// Export các hàm cần thiết
window.app = app;

export { getImageUrl };

function getImageUrl(imageInput) {
    // imageInput có thể là string, mảng, null, undefined
    if (!imageInput) return '';
    let imagePath = '';
    if (Array.isArray(imageInput)) {
        imagePath = imageInput.find(img => typeof img === 'string' && img.includes('uploads/products/')) || imageInput[0];
    } else {
        imagePath = imageInput;
    }
    if (!imagePath) return '';
    if (typeof imagePath !== 'string') return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.includes('uploads/products/')) {
        return `http://localhost:8000${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    }
    return '';
}