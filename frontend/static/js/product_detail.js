// Biến toàn cục để lưu thông tin sản phẩm
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;
let userRating = 0;

// Lấy product ID từ URL
function getProductId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Tải thông tin chi tiết sản phẩm
async function loadProductDetail() {
    const productId = getProductId();

    if (!productId) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch(`/products/${productId}`);

        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }

        const product = await response.json();
        currentProduct = product;

        // Hiển thị thông tin sản phẩm
        displayProductDetail(product);

        // Cập nhật tiêu đề trang
        document.title = `${product.name} - Fashion Store`;

        // Hiển thị đánh giá
        displayReviews(product.reviews || []);

        // Tải sản phẩm tương tự
        loadSimilarProducts(product.category, product.id);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('productDetail').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    Failed to load product details. Please try again later.
                </div>
            </div>
        `;
    }
}

// Hiển thị thông tin chi tiết sản phẩm
function displayProductDetail(product) {
    const productDetailElement = document.getElementById('productDetail');

    productDetailElement.innerHTML = `
        <div class="col-md-6">
            <div class="product-image">
                <img src="${product.image || '/static/images/product-placeholder.jpg'}" class="img-fluid rounded" alt="${product.name}">
            </div>
        </div>
        <div class="col-md-6">
            <h2 class="mb-3">${product.name}</h2>
            <p class="fs-4 fw-bold text-primary mb-3">${formatCurrency(product.price)}</p>
            <p class="mb-4">${product.description}</p>

            <div class="mb-3">
                <h5>Size:</h5>
                <div class="btn-group size-selection" role="group">
                    ${product.size.map(size => `
                        <button type="button" class="btn btn-outline-secondary size-btn" data-size="${size}">${size}</button>
                    `).join('')}
                </div>
            </div>

            <div class="mb-4">
                <h5>Color:</h5>
                <div class="btn-group color-selection" role="group">
                    ${product.color.map(color => `
                        <button type="button" class="btn btn-outline-secondary color-btn" data-color="${color}" style="background-color: ${color.toLowerCase()}; color: ${getContrastColor(color.toLowerCase())}">
                            ${color}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="mb-4">
                <h5>Quantity:</h5>
                <div class="input-group quantity-selector" style="width: 130px">
                    <button class="btn btn-outline-secondary quantity-minus" type="button">-</button>
                    <input type="text" class="form-control text-center" id="quantityInput" value="1" min="1" max="${product.stock}">
                    <button class="btn btn-outline-secondary quantity-plus" type="button">+</button>
                </div>
                <small class="text-muted mt-1 d-block">${product.stock} items in stock</small>
            </div>

            <div class="d-grid gap-2">
                <button class="btn btn-primary btn-lg" id="addToCartBtn" ${product.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `;

    // Thêm event listeners cho các nút size
    document.querySelectorAll('.size-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Xóa class active từ tất cả các nút
            document.querySelectorAll('.size-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Thêm class active cho nút được nhấn
            button.classList.add('active');

            // Lưu size được chọn
            selectedSize = button.getAttribute('data-size');
        });
    });

    // Thêm event listeners cho các nút màu sắc
    document.querySelectorAll('.color-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Xóa class active từ tất cả các nút
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Thêm class active cho nút được nhấn
            button.classList.add('active');

            // Lưu màu sắc được chọn
            selectedColor = button.getAttribute('data-color');
        });
    });

    // Thêm event listeners cho nút tăng/giảm số lượng
    document.querySelector('.quantity-minus').addEventListener('click', () => {
        const input = document.getElementById('quantityInput');
        const value = parseInt(input.value);
        if (value > 1) {
            input.value = value - 1;
        }
    });

    document.querySelector('.quantity-plus').addEventListener('click', () => {
        const input = document.getElementById('quantityInput');
        const value = parseInt(input.value);
        if (value < product.stock) {
            input.value = value + 1;
        }
    });

    // Thêm event listener cho nút "Add to Cart"
    document.getElementById('addToCartBtn').addEventListener('click', handleAddToCart);
}

// Xác định màu chữ tương phản với màu nền
function getContrastColor(hexColor) {
    // Màu mặc định nếu không phải định dạng hex
    if (!/^#[0-9A-F]{6}$/i.test(hexColor)) {
        // Xử lý các màu có tên
        const colorMap = {
            'white': '#000000',
            'black': '#FFFFFF',
            'red': '#FFFFFF',
            'blue': '#FFFFFF',
            'green': '#FFFFFF',
            'yellow': '#000000',
            'purple': '#FFFFFF',
            'pink': '#000000',
            'orange': '#000000',
            'brown': '#FFFFFF',
            'gray': '#FFFFFF'
        };

        return colorMap[hexColor.toLowerCase()] || '#000000';
    }

    // Chuyển hex sang RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Tính độ sáng theo công thức YIQ
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

// Xử lý thêm sản phẩm vào giỏ hàng
async function handleAddToCart() {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('accessToken');

    if (!token) {
        // Lưu URL hiện tại để sau khi đăng nhập có thể quay lại
        window.location.href = `/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }

    // Kiểm tra đã chọn size và màu sắc chưa
    if (!selectedSize) {
        showAlert('Please select a size', 'warning');
        return;
    }

    if (!selectedColor) {
        showAlert('Please select a color', 'warning');
        return;
    }

    // Lấy số lượng
    const quantity = parseInt(document.getElementById('quantityInput').value);

    if (isNaN(quantity) || quantity < 1) {
        showAlert('Please enter a valid quantity', 'warning');
        return;
    }

    try {
        const response = await fetch('/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: currentProduct.id,
                quantity: quantity,
                size: selectedSize,
                color: selectedColor
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

// Hiển thị đánh giá của sản phẩm
function displayReviews(reviews) {
    const reviewsListElement = document.getElementById('reviewsList');
    const noReviewsMessage = document.getElementById('noReviewsMessage');

    if (reviews.length === 0) {
        noReviewsMessage.style.display = 'block';
        return;
    }

    noReviewsMessage.style.display = 'none';
    reviewsListElement.innerHTML = '';

    reviews.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'card mb-3';

        const stars = generateStarRating(review.rating);

        reviewCard.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="card-subtitle text-muted">Reviewed by: Anonymous</h6>
                    <small class="text-muted">${new Date(review.created_at).toLocaleDateString()}</small>
                </div>
                <div class="rating mb-2">
                    ${stars}
                </div>
                ${review.comment ? `<p class="card-text">${review.comment}</p>` : ''}
            </div>
        `;

        reviewsListElement.appendChild(reviewCard);
    });
}

// Tạo HTML cho hiển thị sao đánh giá
function generateStarRating(rating) {
    let stars = '';

    // Số sao đầy
    const fullStars = Math.floor(rating);
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star text-warning"></i>';
    }

    // Nửa sao (nếu có)
    if (rating % 1 >= 0.5) {
        stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        const remainingStars = 5 - fullStars - 1;
        for (let i = 0; i < remainingStars; i++) {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    } else {
        // Sao trống
        const emptyStars = 5 - fullStars;
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    }

    return stars;
}

// Xử lý form đánh giá sản phẩm
document.querySelectorAll('.star-rating').forEach(star => {
    star.addEventListener('mouseover', () => {
        const rating = star.getAttribute('data-rating');
        updateStarDisplay(rating);
    });

    star.addEventListener('mouseout', () => {
        updateStarDisplay(userRating);
    });

    star.addEventListener('click', () => {
        userRating = star.getAttribute('data-rating');
        document.getElementById('ratingInput').value = userRating;
        updateStarDisplay(userRating);
    });
});

// Cập nhật hiển thị sao khi hover hoặc click
function updateStarDisplay(activeRating) {
    document.querySelectorAll('.star-rating').forEach(star => {
        const rating = star.getAttribute('data-rating');

        if (rating <= activeRating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// Xử lý gửi đánh giá
document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Kiểm tra đăng nhập
    const token = localStorage.getItem('accessToken');

    if (!token) {
        window.location.href = `/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }

    // Kiểm tra đã chọn số sao chưa
    if (userRating <= 0) {
        showAlert('Please select a rating', 'warning');
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    const productId = getProductId();

    try {
        const response = await fetch(`/products/${productId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating: parseFloat(userRating),
                comment: comment || null
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit review');
        }

        // Hiển thị thông báo thành công
        showAlert('Your review has been submitted!', 'success');

        // Tải lại trang để hiển thị đánh giá mới
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to submit review. Please try again.', 'danger');
    }
});

// Xử lý gửi tố cáo sản phẩm
document.getElementById('submitReportBtn').addEventListener('click', async () => {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('accessToken');

    if (!token) {
        window.location.href = `/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const description = document.getElementById('reportDescription').value.trim();
    const reportedLink = document.getElementById('reportedLink').value.trim();
    const productId = getProductId();

    if (!description) {
        showAlert('Please provide a description', 'warning');
        return;
    }

    try {
        const response = await fetch(`/products/${productId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                description: description,
                reported_link: reportedLink || null
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit report');
        }

        // Đóng modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
        modal.hide();

        // Reset form
        document.getElementById('reportForm').reset();

        // Hiển thị thông báo thành công
        showAlert('Your report has been submitted and will be reviewed by our team.', 'success');

    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to submit report. Please try again.', 'danger');
    }
});

// Tải sản phẩm tương tự
async function loadSimilarProducts(category, excludeId) {
    try {
        const response = await fetch(`/products?category=${category}&limit=4`);

        if (!response.ok) {
            throw new Error('Failed to fetch similar products');
        }

        let products = await response.json();

        // Loại bỏ sản phẩm hiện tại
        products = products.filter(product => product.id !== excludeId);

        // Hiển thị tối đa 4 sản phẩm
        const similarProductsElement = document.getElementById('similarProducts');
        similarProductsElement.innerHTML = '';

        products.slice(0, 4).forEach(product => {
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
                        <a href="/product_detail.html?id=${product.id}" class="btn btn-outline-primary btn-sm">View Details</a>
                    </div>
                </div>
            `;

            similarProductsElement.appendChild(productCard);
        });

    } catch (error) {
        console.error('Error:', error);
        // Không hiển thị thông báo lỗi cho phần này
    }
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    // Initialize header and footer functionality from common.js
    initCommonElements();

    // Get product ID from URL
    const productId = getUrlParameter('id');
    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    // Load product details
    loadProductDetail(productId);

    // Set up event handlers
    setupEventHandlers();
});

// Load product detail
async function loadProductDetail(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }

        const product = await response.json();

        // Update page with product details
        updateProductDetails(product);

        // Load reviews
        loadProductReviews(productId);

        // Load related products
        loadRelatedProducts(product.category, productId);

        // Hide loading spinner and show product details
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('productDetail').style.display = 'block';
        document.getElementById('reviewsSection').style.display = 'block';
    } catch (error) {
        console.error('Error loading product details:', error);
        document.getElementById('loadingSpinner').innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                <p>Failed to load product details. Please try again later.</p>
                <a href="index.html" class="btn btn-outline-dark mt-3">Return to Homepage</a>
            </div>
        `;
    }
}

// Update product details in the UI
function updateProductDetails(product) {
    // Set title
    document.title = `${product.name} - Fashion Store`;

    // Update product name
    document.getElementById('productName').textContent = product.name;

    // Update price
    const priceElement = document.getElementById('productPrice');
    if (product.sale_price && product.sale_price < product.price) {
        priceElement.innerHTML = `
            <span class="text-danger">${formatCurrency(product.sale_price)}</span>
            <span class="text-decoration-line-through text-muted ms-2">${formatCurrency(product.price)}</span>
        `;
    } else {
        priceElement.textContent = formatCurrency(product.price);
    }

    // Update description
    document.getElementById('productDescription').textContent = product.description;

    // Update stock info
    const stockElement = document.getElementById('stockInfo');
    if (product.stock > 10) {
        stockElement.innerHTML = '<span class="text-success">In Stock</span>';
    } else if (product.stock > 0) {
        stockElement.innerHTML = `<span class="text-warning">Only ${product.stock} left</span>`;
    } else {
        stockElement.innerHTML = '<span class="text-danger">Out of Stock</span>';
        document.getElementById('addToCartBtn').disabled = true;
    }

    // Update images
    updateProductImages(product);

    // Update size options
    updateSizeOptions(product.size || []);

    // Update color options
    updateColorOptions(product.color || []);

    // Update rating
    updateProductRating(product.rating || 0, product.reviews?.length || 0);
}

// Update product images
function updateProductImages(product) {
    const carouselInner = document.getElementById('productImageCarousel');
    const thumbnailsContainer = document.getElementById('productThumbnails');

    // Clear existing content
    carouselInner.innerHTML = '';
    thumbnailsContainer.innerHTML = '';

    // Default image if no images provided
    const images = product.images && product.images.length > 0
        ? product.images
        : ['/frontend/static/images/product-placeholder.jpg'];

    // Add images to carousel
    images.forEach((image, index) => {
        const isActive = index === 0 ? 'active' : '';
        carouselInner.innerHTML += `
            <div class="carousel-item ${isActive}">
                <img src="${image}" class="d-block w-100" alt="${product.name}" style="height: 400px; object-fit: contain;">
            </div>
        `;

        // Add thumbnails
        thumbnailsContainer.innerHTML += `
            <div class="col-3">
                <img src="${image}" class="img-thumbnail" alt="${product.name}" 
                    onclick="document.querySelector('#productImages .carousel-item.active').classList.remove('active');
                            document.querySelectorAll('#productImages .carousel-item')[${index}].classList.add('active');"
                    style="cursor: pointer; height: 80px; object-fit: cover;">
            </div>
        `;
    });
}

// Update size options
function updateSizeOptions(sizes) {
    const sizeOptionsContainer = document.getElementById('sizeOptions');
    sizeOptionsContainer.innerHTML = '';

    if (!sizes || sizes.length === 0) {
        sizeOptionsContainer.innerHTML = '<p class="text-muted">No size options available</p>';
        return;
    }

    sizes.forEach(size => {
        sizeOptionsContainer.innerHTML += `
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="sizeOption" id="size-${size}" value="${size}">
                <label class="form-check-label" for="size-${size}">${size}</label>
            </div>
        `;
    });

    // Select first size by default
    const firstSizeInput = document.querySelector('input[name="sizeOption"]');
    if (firstSizeInput) {
        firstSizeInput.checked = true;
    }
}

// Update color options
function updateColorOptions(colors) {
    const colorOptionsContainer = document.getElementById('colorOptions');
    colorOptionsContainer.innerHTML = '';

    if (!colors || colors.length === 0) {
        colorOptionsContainer.innerHTML = '<p class="text-muted">No color options available</p>';
        return;
    }

    colors.forEach(color => {
        colorOptionsContainer.innerHTML += `
            <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" name="colorOption" id="color-${color}" value="${color}">
                <label class="form-check-label" for="color-${color}">
                    <span class="color-circle" style="background-color: ${color}"></span> ${color}
                </label>
            </div>
        `;
    });

    // Select first color by default
    const firstColorInput = document.querySelector('input[name="colorOption"]');
    if (firstColorInput) {
        firstColorInput.checked = true;
    }
}

// Update product rating
function updateProductRating(rating, reviewCount) {
    const ratingElement = document.getElementById('productRating');
    const reviewCountElement = document.getElementById('reviewCount');

    ratingElement.innerHTML = generateStarRating(rating);
    reviewCountElement.textContent = `(${reviewCount} reviews)`;
}

// Load product reviews
async function loadProductReviews(productId) {
    try {
        const response = await fetch(`/api/products/${productId}/reviews`);
        if (!response.ok) {
            throw new Error('Failed to fetch reviews');
        }

        const reviews = await response.json();
        const reviewsListElement = document.getElementById('reviewsList');
        const noReviewsElement = document.getElementById('noReviews');

        if (reviews.length === 0) {
            reviewsListElement.innerHTML = '';
            noReviewsElement.style.display = 'block';
            return;
        }

        noReviewsElement.style.display = 'none';
        reviewsListElement.innerHTML = '';

        reviews.forEach(review => {
            reviewsListElement.innerHTML += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <h6 class="mb-0">${review.user_name}</h6>
                                <small class="text-muted">${formatDate(review.created_at)}</small>
                            </div>
                            <div class="text-warning">
                                ${generateStarRating(review.rating)}
                            </div>
                        </div>
                        <p class="card-text">${review.comment}</p>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsList').innerHTML = `
            <div class="alert alert-warning">
                Failed to load reviews. Please try refreshing the page.
            </div>
        `;
    }
}

// Load related products
async function loadRelatedProducts(category, currentProductId) {
    try {
        const response = await fetch(`/api/products?category=${category}&limit=4`);
        if (!response.ok) {
            throw new Error('Failed to fetch related products');
        }

        const data = await response.json();
        const products = data.items || data;

        // Filter out current product and limit to 4 items
        const relatedProducts = products
            .filter(product => product.id !== currentProductId)
            .slice(0, 4);

        const relatedProductsContainer = document.getElementById('relatedProducts');

        if (relatedProducts.length === 0) {
            relatedProductsContainer.innerHTML = '<p class="text-center text-muted">No related products found</p>';
            return;
        }

        relatedProductsContainer.innerHTML = '';

        relatedProducts.forEach(product => {
            relatedProductsContainer.innerHTML += `
                <div class="col-md-3 col-6 mb-4">
                    <div class="card h-100 product-card">
                        <a href="product_detail.html?id=${product.id}" class="text-decoration-none">
                            <img src="${product.image_url || '/frontend/static/images/product-placeholder.jpg'}" 
                                class="card-img-top" alt="${product.name}"
                                style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <h6 class="card-title text-dark">${product.name}</h6>
                                <p class="card-text text-primary">${formatCurrency(product.price)}</p>
                                <div class="text-warning small">
                                    ${generateStarRating(product.rating || 0)}
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading related products:', error);
        document.getElementById('relatedProducts').innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    Failed to load related products.
                </div>
            </div>
        `;
    }
}

// Set up event handlers
function setupEventHandlers() {
    // Quantity input handlers
    const quantityInput = document.getElementById('quantityInput');
    document.getElementById('decreaseQuantity').addEventListener('click', () => {
        if (quantityInput.value > 1) {
            quantityInput.value = parseInt(quantityInput.value) - 1;
        }
    });

    document.getElementById('increaseQuantity').addEventListener('click', () => {
        quantityInput.value = parseInt(quantityInput.value) + 1;
    });

    // Add to cart button handler
    document.getElementById('addToCartBtn').addEventListener('click', addToCart);

    // Report product button handler
    document.getElementById('reportProductBtn').addEventListener('click', showReportModal);

    // Review form handler
    setupReviewForm();

    // Report form handler
    setupReportForm();
}

// Add to cart function
async function addToCart() {
    const productId = getUrlParameter('id');
    const quantity = parseInt(document.getElementById('quantityInput').value);

    // Get selected size and color
    const selectedSize = document.querySelector('input[name="sizeOption"]:checked')?.value;
    const selectedColor = document.querySelector('input[name="colorOption"]:checked')?.value;

    try {
        // Check if user is logged in
        if (!isLoggedIn()) {
            window.location.href = `login.html?returnUrl=product_detail.html?id=${productId}`;
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
                quantity: quantity,
                size: selectedSize,
                color: selectedColor
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add product to cart');
        }

        // Show success message and update cart count
        document.getElementById('addToCartSuccess').style.display = 'block';
        document.getElementById('addToCartError').style.display = 'none';

        // Hide success message after 3 seconds
        setTimeout(() => {
            document.getElementById('addToCartSuccess').style.display = 'none';
        }, 3000);

        // Update cart count
        updateCartCount();
    } catch (error) {
        console.error('Error adding product to cart:', error);
        document.getElementById('addToCartSuccess').style.display = 'none';
        document.getElementById('addToCartError').style.display = 'block';

        // Hide error message after 3 seconds
        setTimeout(() => {
            document.getElementById('addToCartError').style.display = 'none';
        }, 3000);
    }
}

// Show report product modal
function showReportModal() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        document.getElementById('loginToReport').style.display = 'block';
        document.getElementById('reportForm').style.display = 'none';
    } else {
        document.getElementById('loginToReport').style.display = 'none';
        document.getElementById('reportForm').style.display = 'block';
    }

    // Show modal
    const reportModal = new bootstrap.Modal(document.getElementById('reportProductModal'));
    reportModal.show();
}

// Setup review form
function setupReviewForm() {
    // Set up star rating
    const ratingStars = document.querySelectorAll('.rating-star');
    ratingStars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });

        star.addEventListener('mouseout', function() {
            const currentRating = parseInt(document.getElementById('ratingInput').value);
            highlightStars(currentRating);
        });

        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            document.getElementById('ratingInput').value = rating;
            highlightStars(rating);
        });
    });

    // Check if user is logged in
    if (isLoggedIn()) {
        document.getElementById('loginToReview').style.display = 'none';
        document.getElementById('reviewForm').style.display = 'block';

        // Set up review submission
        document.getElementById('submitReviewBtn').addEventListener('click', submitReview);
    } else {
        document.getElementById('loginToReview').style.display = 'block';
        document.getElementById('reviewForm').style.display = 'none';

        // Update login link with return URL
        const loginLink = document.querySelector('#loginToReview a');
        if (loginLink) {
            loginLink.href = `login.html?returnUrl=product_detail.html?id=${getUrlParameter('id')}`;
        }
    }
}

// Highlight stars for rating
function highlightStars(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// Submit review
async function submitReview() {
    const productId = getUrlParameter('id');
    const rating = parseInt(document.getElementById('ratingInput').value);
    const comment = document.getElementById('reviewComment').value;

    // Validate input
    if (rating === 0) {
        showAlert('reviewWarning', 'Please select a rating.');
        return;
    }

    if (!comment.trim()) {
        showAlert('reviewWarning', 'Please write a review comment.');
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                rating: rating,
                comment: comment
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to submit review');
        }

        // Show success message
        showAlert('reviewSuccess', 'Your review has been submitted successfully!');

        // Clear form
        document.getElementById('ratingInput').value = 0;
        document.getElementById('reviewComment').value = '';
        highlightStars(0);

        // Reload reviews
        loadProductReviews(productId);
    } catch (error) {
        console.error('Error submitting review:', error);
        showAlert('reviewError', error.message || 'Failed to submit review. Please try again.');
    }
}

// Setup report form
function setupReportForm() {
    document.getElementById('submitReportBtn').addEventListener('click', submitReport);
}

// Submit report
async function submitReport() {
    const productId = getUrlParameter('id');
    const reason = document.getElementById('reportReason').value;
    const description = document.getElementById('reportDescription').value;

    // Validate input
    if (!reason) {
        alert('Please select a reason for your report.');
        return;
    }

    if (!description.trim()) {
        alert('Please provide a description for your report.');
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                reason: reason,
                description: description
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit report');
        }

        // Close modal
        const reportModal = bootstrap.Modal.getInstance(document.getElementById('reportProductModal'));
        reportModal.hide();

        // Reset form
        document.getElementById('reportReason').value = '';
        document.getElementById('reportDescription').value = '';

        // Show success message
        showToast('Report submitted successfully. We will review it shortly.', 'success');
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('Failed to submit report. Please try again.');
    }
}

// Helper function to show alert
function showAlert(elementId, message) {
    const alertElement = document.getElementById(elementId);
    alertElement.textContent = message;
    alertElement.style.display = 'block';

    // Hide alert after 3 seconds
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 3000);
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

// Format date helper function
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Helper function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Helper function to format currency - this might be defined in common.js
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
}



