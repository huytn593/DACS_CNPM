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
document.addEventListener('DOMContentLoaded', () => {
    // Tải thông tin chi tiết sản phẩm
    loadProductDetail();

    // Cập nhật trạng thái người dùng trong header
    updateUserState();

    // Cập nhật số lượng sản phẩm trong giỏ hàng
    updateCartCount();

    // Load danh mục sản phẩm động
    loadCategories();
});