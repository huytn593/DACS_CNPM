// Biến toàn cục
let currentPage = 1;
const productsPerPage = 8;
let currentFilter = 'all';
let currentSort = 'newest';
let isLoading = false;
let allProductsLoaded = false;

// Hàm load sản phẩm từ API
async function loadProducts(page = 1, filter = 'all', sort = 'newest', append = false) {
    if (isLoading || (allProductsLoaded && append)) return;

    isLoading = true;

    // Hiển thị spinner nếu không phải append
    if (!append) {
        document.getElementById('productsGrid').innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    } else {
        // Hiển thị spinner ở cuối danh sách khi append
        const loadingSpinner = document.createElement('div');
        loadingSpinner.id = 'loadingMore';
        loadingSpinner.className = 'col-12 text-center mt-3';
        loadingSpinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.getElementById('productsGrid').appendChild(loadingSpinner);
    }

    try {
        // Xây dựng URL với các tham số
        let url = `/products?limit=${productsPerPage}&skip=${(page - 1) * productsPerPage}`;

        // Thêm filter nếu không phải 'all'
        if (filter !== 'all') {
            url += `&category=${filter}`;
        }

        // Thêm sort option
        if (sort === 'price-asc') {
            url += '&sort_by=price&sort_order=1';
        } else if (sort === 'price-desc') {
            url += '&sort_by=price&sort_order=-1';
        } else {
            // Mặc định sort theo created_at (newest first)
            url += '&sort_by=created_at&sort_order=-1';
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        const products = await response.json();

        // Xóa spinner
        if (!append) {
            document.getElementById('productsGrid').innerHTML = '';
        } else {
            document.getElementById('loadingMore')?.remove();
        }

        // Kiểm tra nếu không có sản phẩm nào trả về
        if (products.length === 0) {
            if (!append) {
                document.getElementById('productsGrid').innerHTML = `
                    <div class="col-12 text-center">
                        <p>No products found. Please try a different filter.</p>
                    </div>
                `;
            }
            allProductsLoaded = true;
            document.getElementById('loadMoreBtn').disabled = true;
            document.getElementById('loadMoreBtn').innerHTML = 'No More Products';
            isLoading = false;
            return;
        }

        // Hiển thị sản phẩm
        displayProducts(products, append);

        // Kiểm tra nếu số lượng sản phẩm nhỏ hơn productsPerPage, nghĩa là đã load hết
        if (products.length < productsPerPage) {
            allProductsLoaded = true;
            document.getElementById('loadMoreBtn').disabled = true;
            document.getElementById('loadMoreBtn').innerHTML = 'No More Products';
        } else {
            allProductsLoaded = false;
            document.getElementById('loadMoreBtn').disabled = false;
            document.getElementById('loadMoreBtn').innerHTML = 'Load More';
        }

        currentPage = page;

    } catch (error) {
        console.error('Error:', error);

        if (!append) {
            document.getElementById('productsGrid').innerHTML = `
                <div class="col-12 text-center">
                    <p>Failed to load products. Please try again later.</p>
                </div>
            `;
        } else {
            document.getElementById('loadingMore')?.remove();
        }
    } finally {
        isLoading = false;
    }
}

// Hiển thị sản phẩm trong grid
function displayProducts(products, append = false) {
    const productsGrid = document.getElementById('productsGrid');

    if (!append) {
        productsGrid.innerHTML = '';
    }

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'col-md-6 col-lg-3 mb-4';

        productCard.innerHTML = `
            <div class="card h-100 product-card">
                <div class="product-image">
                    <img src="${product.image || '/static/images/product-placeholder.jpg'}" class="card-img-top" alt="${product.name}">
                </div>
                <div class="card-body">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text text-muted">${formatCurrency(product.price)}</p>
                    <div class="d-flex justify-content-between">
                        <a href="/product_detail.html?id=${product.id}" class="btn btn-outline-primary btn-sm">View Details</a>
                        <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${product.id}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;

        productsGrid.appendChild(productCard);
    });

    // Thêm event listeners cho các nút "Add to Cart"
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', handleAddToCart);
    });
}

// Xử lý thêm sản phẩm vào giỏ hàng
async function handleAddToCart(e) {
    e.preventDefault();

    const productId = e.currentTarget.getAttribute('data-id');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
        window.location.href = '/login.html';
        return;
    }

    try {
        // Mặc định số lượng là 1, size và color lấy giá trị đầu tiên
        // Trong thực tế, nên mở modal cho người dùng chọn size và color
        const response = await fetch('/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1,
                size: null, // Sẽ được chọn trong trang chi tiết
                color: null  // Sẽ được chọn trong trang chi tiết
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add product to cart');
        }

        // Hiển thị thông báo thành công
        showAlert('Product added to cart!', 'success');

        // Cập nhật số lượng sản phẩm trong giỏ hàng
        updateCartCount();

    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to add product to cart. Please try again.', 'danger');
    }
}

// Xử lý khi người dùng nhấn nút "Load More"
document.getElementById('loadMoreBtn').addEventListener('click', () => {
    loadProducts(currentPage + 1, currentFilter, currentSort, true);
});

// Xử lý khi người dùng nhấn vào filter button
document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // Xóa class active từ tất cả các nút
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Thêm class active cho nút được nhấn
        e.currentTarget.classList.add('active');

        // Lấy filter mới
        currentFilter = e.currentTarget.getAttribute('data-filter');

        // Reset trạng thái
        currentPage = 1;
        allProductsLoaded = false;

        // Load sản phẩm với filter mới
        loadProducts(currentPage, currentFilter, currentSort);
    });
});

// Xử lý khi người dùng thay đổi sort option
document.getElementById('sortOptions').addEventListener('change', (e) => {
    currentSort = e.target.value;

    // Reset trạng thái
    currentPage = 1;
    allProductsLoaded = false;

    // Load sản phẩm với sort option mới
    loadProducts(currentPage, currentFilter, currentSort);
});

// Xử lý form tìm kiếm
document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const searchQuery = document.getElementById('searchInput').value.trim();

    if (searchQuery) {
        window.location.href = `/search.html?q=${encodeURIComponent(searchQuery)}`;
    }
});

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', () => {
    // Load sản phẩm khi trang load xong
    loadProducts();

    // Cập nhật trạng thái người dùng trong header
    updateUserState();

    // Cập nhật số lượng sản phẩm trong giỏ hàng
    updateCartCount();

    // Load danh mục sản phẩm động
    loadCategories();
});

// Load danh mục sản phẩm động
async function loadCategories() {
    try {
        const response = await fetch('/categories');

        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }

        const categories = await response.json();

        const categoryMenu = document.getElementById('categoryMenu');
        categoryMenu.innerHTML = '';

        categories.forEach(category => {
            const li = document.createElement('li');
            li.innerHTML = `<a class="dropdown-item" href="/?category=${category.id}">${category.name}</a>`;
            categoryMenu.appendChild(li);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Load featured categories
    loadFeaturedCategories();

    // Load featured products
    loadFeaturedProducts();

    // Load new arrivals
    loadNewArrivals();

    // Load testimonials
    loadTestimonials();

    // Setup newsletter form
    setupNewsletterForm();
});

// Load featured categories
async function loadFeaturedCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();

        const categoriesContainer = document.getElementById('featuredCategories');
        if (!categoriesContainer) return;

        // Clear any existing content
        categoriesContainer.innerHTML = '';

        // Display up to 4 categories
        const displayCategories = categories.slice(0, 4);

        displayCategories.forEach(category => {
            categoriesContainer.innerHTML += `
                <div class="col-6 col-md-3">
                    <a href="products.html?category=${category.name.toLowerCase()}" class="text-decoration-none">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <i class="fas fa-tshirt fa-3x text-primary"></i>
                                </div>
                                <h5 class="card-title">${category.name}</h5>
                                <p class="card-text text-muted small">${category.description || 'Shop now'}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load featured products
async function loadFeaturedProducts() {
    try {
        const response = await fetch('/api/products/featured');
        const products = await response.json();

        const productsContainer = document.getElementById('featuredProducts');
        if (!productsContainer) return;

        // Clear any existing content
        productsContainer.innerHTML = '';

        // Display up to 4 products
        const displayProducts = products.slice(0, 4);

        displayProducts.forEach(product => {
            productsContainer.innerHTML += createProductCard(product);
        });
    } catch (error) {
        console.error('Error loading featured products:', error);
    }
}

// Load new arrivals
async function loadNewArrivals() {
    try {
        const response = await fetch('/api/products/new');
        const products = await response.json();

        const productsContainer = document.getElementById('newArrivals');
        if (!productsContainer) return;

        // Clear any existing content
        productsContainer.innerHTML = '';

        // Display up to 4 products
        const displayProducts = products.slice(0, 4);

        displayProducts.forEach(product => {
            productsContainer.innerHTML += createProductCard(product);
        });
    } catch (error) {
        console.error('Error loading new arrivals:', error);
    }
}

// Create product card HTML
function createProductCard(product) {
    // Calculate discount percentage if on sale
    let discountBadge = '';
    if (product.original_price && product.original_price > product.price) {
        const discountPercent = Math.round((product.original_price - product.price) / product.original_price * 100);
        discountBadge = `<span class="badge bg-danger position-absolute top-0 end-0 m-2">-${discountPercent}%</span>`;
    }

    return `
        <div class="col-6 col-md-3">
            <div class="card h-100 border-0 shadow-sm product-card">
                ${discountBadge}
                <a href="product-detail.html?id=${product.id}" class="text-decoration-none">
                    <img src="${product.image || '/frontend/static/images/product-placeholder.jpg'}" class="card-img-top" alt="${product.name}">
                    <div class="card-body">
                        <h6 class="card-title text-dark">${product.name}</h6>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold text-dark">${formatCurrency(product.price)}</span>
                                ${product.original_price ? `<span class="text-muted text-decoration-line-through ms-2 small">${formatCurrency(product.original_price)}</span>` : ''}
                            </div>
                            <div class="text-warning small">
                                ${generateStarRating(product.rating || 0)}
                            </div>
                        </div>
                    </div>
                </a>
                <div class="card-footer bg-white border-0 pt-0">
                    <button class="btn btn-outline-dark btn-sm w-100" onclick="addToCart('${product.id}', 1)">
                        <i class="fas fa-shopping-cart me-1"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load testimonials
function loadTestimonials() {
    const testimonials = [
        {
            name: "Nguyễn Thị Hương",
            avatar: "/frontend/static/images/avatar-1.jpg",
            review: "I've been shopping here for years and the quality is always excellent. Fast shipping and great customer service!",
            rating: 5
        },
        {
            name: "Trần Văn Minh",
            avatar: "/frontend/static/images/avatar-2.jpg",
            review: "The clothes I bought fit perfectly. The size guide is very accurate and the materials are high quality.",
            rating: 4
        },
        {
            name: "Lê Thị Hà",
            avatar: "/frontend/static/images/avatar-3.jpg",
            review: "Affordable prices with excellent quality. My go-to fashion store for all occasions.",
            rating: 5
        }
    ];

    const testimonialsContainer = document.getElementById('testimonials');
    if (!testimonialsContainer) return;

    testimonials.forEach(testimonial => {
        testimonialsContainer.innerHTML += `
            <div class="col-md-4">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex mb-3">
                            <img src="${testimonial.avatar}" alt="${testimonial.name}" class="rounded-circle me-3" width="60" height="60">
                            <div>
                                <h6 class="mb-1">${testimonial.name}</h6>
                                <div class="text-warning small">
                                    ${generateStarRating(testimonial.rating)}
                                </div>
                            </div>
                        </div>
                        <p class="card-text">"${testimonial.review}"</p>
                    </div>
                </div>
            </div>
        `;
    });
}

// Generate star rating HTML
function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i> ';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i> ';
        } else {
            stars += '<i class="far fa-star"></i> ';
        }
    }
    return stars;
}

// Setup newsletter form
function setupNewsletterForm() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('newsletterEmail').value;

        // Here you would normally send this to your API
        // For now, let's just show a success message

        // Clear the form
        newsletterForm.reset();

        // Show success message
        showToast('Thank you for subscribing to our newsletter!', 'success');
    });
}

// Helper function to format currency (this should also be in common.js)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}

// Add to cart function (should be in common.js but including here for completeness)
async function addToCart(productId, quantity) {
    try {
        // Check if user is logged in
        if (!isLoggedIn()) {
            showToast('Please log in to add items to cart', 'warning');
            return;
        }

        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity
            })
        });

        if (response.ok) {
            showToast('Item added to cart!', 'success');
            updateCartCount();
        } else {
            const data = await response.json();
            showToast(data.detail || 'Failed to add item to cart', 'danger');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('An error occurred. Please try again.', 'danger');
    }
}
document.addEventListener('DOMContentLoaded', function() {
    // Initialize header and footer functionality from common.js
    initCommonElements();

    // Load featured categories
    loadFeaturedCategories();

    // Load featured products
    loadFeaturedProducts();

    // Load new arrivals
    loadNewArrivals();

    // Setup newsletter form
    setupNewsletterForm();
});

// Load featured categories
async function loadFeaturedCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }

        const categories = await response.json();
        const categoriesContainer = document.getElementById('featuredCategories');
        if (!categoriesContainer) return;

        // Clear any existing content
        categoriesContainer.innerHTML = '';

        // Display up to 4 categories
        const displayCategories = categories.slice(0, 4);

        // Create icons mapping for different categories
        const categoryIcons = {
            'men': 'male',
            'women': 'female',
            'kids': 'child',
            'accessories': 'glasses',
            'shoes': 'shoe-prints',
            'bags': 'shopping-bag',
            'watches': 'clock',
            'jewelry': 'gem',
            'sale': 'tags'
        };

        displayCategories.forEach(category => {
            const iconName = categoryIcons[category.name.toLowerCase()] || 'tshirt';

            categoriesContainer.innerHTML += `
                <div class="col-6 col-md-3">
                    <a href="products.html?category=${encodeURIComponent(category.name.toLowerCase())}" class="text-decoration-none">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <i class="fas fa-${iconName} fa-3x text-dark"></i>
                                </div>
                                <h5 class="card-title">${category.name}</h5>
                                <p class="card-text text-muted small">${category.description || 'Shop now'}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading categories:', error);

        // Keep the placeholder categories if API fails
        const categoriesContainer = document.getElementById('featuredCategories');
        if (categoriesContainer && categoriesContainer.children.length === 0) {
            categoriesContainer.innerHTML = `
                <div class="col-6 col-md-3">
                    <a href="products.html?category=men" class="text-decoration-none">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <i class="fas fa-male fa-3x text-dark"></i>
                                </div>
                                <h5 class="card-title">Men</h5>
                                <p class="card-text text-muted small">Shop men's collection</p>
                            </div>
                        </div>
                    </a>
                </div>
                <div class="col-6 col-md-3">
                    <a href="products.html?category=women" class="text-decoration-none">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <i class="fas fa-female fa-3x text-dark"></i>
                                </div>
                                <h5 class="card-title">Women</h5>
                                <p class="card-text text-muted small">Shop women's collection</p>
                            </div>
                        </div>
                    </a>
                </div>
                <div class="col-6 col-md-3">
                    <a href="products.html?category=kids" class="text-decoration-none">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <i class="fas fa-child fa-3x text-dark"></i>
                                </div>
                                <h5 class="card-title">Kids</h5>
                                <p class="card-text text-muted small">Shop kids' collection</p>
                            </div>
                        </div>
                    </a>
                </div>
                <div class="col-6 col-md-3">
                    <a href="products.html?category=accessories" class="text-decoration-none">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <i class="fas fa-glasses fa-3x text-dark"></i>
                                </div>
                                <h5 class="card-title">Accessories</h5>
                                <p class="card-text text-muted small">Shop accessories</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
        }
    }
}

// Load featured products
async function loadFeaturedProducts() {
    try {
        const response = await fetch('/api/products?featured=true&limit=4');
        if (!response.ok) {
            throw new Error('Failed to fetch featured products');
        }

        const data = await response.json();
        const products = data.items || data;

        const productsContainer = document.getElementById('featuredProducts');
        if (!productsContainer) return;

        // Clear any existing content
        productsContainer.innerHTML = '';

        // Handle case with no products
        if (!products || products.length === 0) {
            productsContainer.innerHTML = '<div class="col-12 text-center"><p>No featured products available at the moment.</p></div>';
            return;
        }

        // Display products
        products.forEach(product => {
            productsContainer.innerHTML += createProductCard(product);
        });
    } catch (error) {
        console.error('Error loading featured products:', error);

        // Keep placeholder content if API fails
        const productsContainer = document.getElementById('featuredProducts');
        if (productsContainer && productsContainer.querySelectorAll('.product-card:not(.placeholder-glow)').length === 0) {
            // The placeholder content is already in the HTML
        }
    }
}

// Load new arrivals
async function loadNewArrivals() {
    try {
        const response = await fetch('/api/products?sort=created_at&order=desc&limit=4');
        if (!response.ok) {
            throw new Error('Failed to fetch new arrivals');
        }

        const data = await response.json();
        const products = data.items || data;

        const productsContainer = document.getElementById('newArrivals');
        if (!productsContainer) return;

        // Clear any existing content
        productsContainer.innerHTML = '';

        // Handle case with no products
        if (!products || products.length === 0) {
            productsContainer.innerHTML = '<div class="col-12 text-center"><p>No new arrivals available at the moment.</p></div>';
            return;
        }

        // Display products
        products.forEach(product => {
            productsContainer.innerHTML += createProductCard(product);
        });
    } catch (error) {
        console.error('Error loading new arrivals:', error);

        // Add placeholder content if API fails
        const productsContainer = document.getElementById('newArrivals');
        if (productsContainer && productsContainer.children.length === 0) {
            productsContainer.innerHTML = `
                <div class="col-6 col-md-3">
                    <div class="card h-100 border-0 shadow-sm product-card placeholder-glow">
                        <div class="placeholder col-12" style="height: 200px;"></div>
                        <div class="card-body">
                            <h6 class="card-title placeholder col-8"></h6>
                            <div class="placeholder col-6 mt-2"></div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card h-100 border-0 shadow-sm product-card placeholder-glow">
                        <div class="placeholder col-12" style="height: 200px;"></div>
                        <div class="card-body">
                            <h6 class="card-title placeholder col-8"></h6>
                            <div class="placeholder col-6 mt-2"></div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card h-100 border-0 shadow-sm product-card placeholder-glow">
                        <div class="placeholder col-12" style="height: 200px;"></div>
                        <div class="card-body">
                            <h6 class="card-title placeholder col-8"></h6>
                            <div class="placeholder col-6 mt-2"></div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card h-100 border-0 shadow-sm product-card placeholder-glow">
                        <div class="placeholder col-12" style="height: 200px;"></div>
                        <div class="card-body">
                            <h6 class="card-title placeholder col-8"></h6>
                            <div class="placeholder col-6 mt-2"></div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// Create product card HTML
function createProductCard(product) {
    // Calculate discount percentage if on sale
    let discountBadge = '';
    if (product.original_price && product.original_price > product.price) {
        const discountPercent = Math.round((product.original_price - product.price) / product.original_price * 100);
        discountBadge = `<span class="badge bg-danger position-absolute top-0 end-0 m-2">-${discountPercent}%</span>`;
    }

    return `
        <div class="col-6 col-md-3">
            <div class="card h-100 border-0 shadow-sm product-card">
                ${discountBadge}
                <a href="product-detail.html?id=${product.id}" class="text-decoration-none">
                    <img src="${product.image_url || '/frontend/static/images/product-placeholder.jpg'}" class="card-img-top" alt="${product.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title text-dark">${product.name}</h6>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold text-dark">${formatCurrency(product.price)}</span>
                                ${product.original_price ? `<span class="text-muted text-decoration-line-through ms-2 small">${formatCurrency(product.original_price)}</span>` : ''}
                            </div>
                            <div class="text-warning small">
                                ${generateStarRating(product.rating || 0)}
                            </div>
                        </div>
                    </div>
                </a>
                <div class="card-footer bg-white border-0 pt-0">
                    <button class="btn btn-outline-dark btn-sm w-100" onclick="addToCart('${product.id}', 1)">
                        <i class="fas fa-shopping-cart me-1"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Generate star rating HTML
function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Setup newsletter form
function setupNewsletterForm() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('newsletterEmail').value;

        // Here you would normally send this to your API
        // For now, let's just show a success message

        // Clear the form
        newsletterForm.reset();

        // Show success message
        showToast('Thank you for subscribing to our newsletter!', 'success');
    });
}

// Helper function to format currency - this should be defined in common.js
// But we'll define it here as a fallback
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}