// /frontend/static/js/product.js

document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadCategories();
    loadProductDetail();
    setupEventListeners();
});

// Global variables
let currentProduct = null;
let currentQuantity = 1;
let selectedSize = null;
let selectedColor = null;

function setupEventListeners() {
    // Quantity controls
    document.getElementById('decreaseQuantity').addEventListener('click', function() {
        if (currentQuantity > 1) {
            currentQuantity--;
            document.getElementById('quantity').value = currentQuantity;
        }
    });

    document.getElementById('increaseQuantity').addEventListener('click', function() {
        currentQuantity++;
        document.getElementById('quantity').value = currentQuantity;
    });

    document.getElementById('quantity').addEventListener('change', function() {
        let value = parseInt(this.value);
        if (isNaN(value) || value < 1) {
            value = 1;
            this.value = 1;
        }
        currentQuantity = value;
    });

    // Add to cart button
    document.getElementById('addToCartBtn').addEventListener('click', addToCart);

    // Add to wishlist button
    document.getElementById('wishlistBtn').addEventListener('click', toggleWishlist);

    // Size selection
    document.querySelectorAll('.size-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedSize = this.getAttribute('data-size');
        });
    });

    // Color selection
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedColor = this.getAttribute('data-color');
        });
    });
}

async function loadProductDetail() {
    // Show loading spinner
    document.getElementById('productLoading').classList.remove('d-none');
    document.getElementById('productContent').classList.add('d-none');

    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = '/404.html';
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
            throw new Error('Product not found');
        }

        const product = await response.json();
        currentProduct = product;

        // Update page title
        document.title = `${product.name} - Fashion Store`;

        // Populate product details
        renderProductDetail(product);

        // Load reviews
        loadProductReviews(productId);

        // Load related products
        loadRelatedProducts(product.category);

        // Check if product is in wishlist
        checkWishlistStatus(productId);

        // Hide loading, show content
        document.getElementById('productLoading').classList.add('d-none');
        document.getElementById('productContent').classList.remove('d-none');
    } catch (error) {
        console.error('Error loading product:', error);
        document.getElementById('productLoading').classList.add('d-none');
        document.getElementById('errorMessage').classList.remove('d-none');
    }
}

function renderProductDetail(product) {
    // Main product image
    const mainImage = document.getElementById('mainProductImage');
    mainImage.src = product.image_url || '/frontend/static/images/product-placeholder.jpg';
    mainImage.alt = product.name;

    // Product thumbnails
    const thumbnailContainer = document.getElementById('productThumbnails');
    thumbnailContainer.innerHTML = '';

    // Main image as first thumbnail
    const mainThumb = document.createElement('div');
    mainThumb.className = 'col-3';
    mainThumb.innerHTML = `
        <img src="${product.image_url || '/frontend/static/images/product-placeholder.jpg'}" 
             class="img-thumbnail product-thumbnail active" 
             alt="${product.name}">
    `;
    thumbnailContainer.appendChild(mainThumb);

    // Additional images if available
    if (product.additional_images && product.additional_images.length > 0) {
        product.additional_images.forEach(imgUrl => {
            const thumb = document.createElement('div');
            thumb.className = 'col-3';
            thumb.innerHTML = `
                <img src="${imgUrl}" 
                     class="img-thumbnail product-thumbnail" 
                     alt="${product.name}">
            `;
            thumbnailContainer.appendChild(thumb);
        });
    }

    // Add click event for thumbnails
    document.querySelectorAll('.product-thumbnail').forEach(thumb => {
        thumb.addEventListener('click', function() {
            document.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            mainImage.src = this.src;
        });
    });

    // Product info
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent = formatCurrency(product.price);
    document.getElementById('productDescription').textContent = product.description;

    // Availability
    const availabilityBadge = document.getElementById('availabilityBadge');
    if (product.in_stock) {
        availabilityBadge.textContent = 'In Stock';
        availabilityBadge.className = 'badge bg-success';
        document.getElementById('addToCartBtn').disabled = false;
    } else {
        availabilityBadge.textContent = 'Out of Stock';
        availabilityBadge.className = 'badge bg-danger';
        document.getElementById('addToCartBtn').disabled = true;
    }

    // Rating
    const ratingStars = document.getElementById('productRating');
    ratingStars.innerHTML = '';
    const rating = product.average_rating || 0;
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        if (i <= rating) {
            star.className = 'fas fa-star text-warning';
        } else if (i - 0.5 <= rating) {
            star.className = 'fas fa-star-half-alt text-warning';
        } else {
            star.className = 'far fa-star text-warning';
        }
        ratingStars.appendChild(star);
    }
    document.getElementById('ratingCount').textContent = `(${product.rating_count || 0})`;

    // Size options
    const sizeContainer = document.getElementById('sizeOptions');
    sizeContainer.innerHTML = '';
    if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach(size => {
            const sizeOption = document.createElement('div');
            sizeOption.className = 'size-option';
            sizeOption.setAttribute('data-size', size);
            sizeOption.textContent = size;
            sizeContainer.appendChild(sizeOption);
        });
        document.getElementById('sizeSection').classList.remove('d-none');
    } else {
        document.getElementById('sizeSection').classList.add('d-none');
    }

    // Color options
    const colorContainer = document.getElementById('colorOptions');
    colorContainer.innerHTML = '';
    if (product.colors && product.colors.length > 0) {
        product.colors.forEach(color => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.setAttribute('data-color', color);
            colorOption.style.backgroundColor = color;
            colorContainer.appendChild(colorOption);
        });
        document.getElementById('colorSection').classList.remove('d-none');
    } else {
        document.getElementById('colorSection').classList.add('d-none');
    }

    // Reset selections
    currentQuantity = 1;
    document.getElementById('quantity').value = 1;
    selectedSize = null;
    selectedColor = null;

    // Setup event listeners for the new elements
    setupEventListeners();
}

async function loadProductReviews(productId) {
    try {
        const response = await fetch(`/api/products/${productId}/reviews`);
        if (!response.ok) {
            throw new Error('Failed to load reviews');
        }

        const reviews = await response.json();

        const reviewsContainer = document.getElementById('productReviews');
        reviewsContainer.innerHTML = '';

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p class="text-muted">No reviews yet. Be the first to review this product!</p>';
            return;
        }

        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'mb-4 border-bottom pb-3';

            let starsHTML = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= review.rating) {
                    starsHTML += '<i class="fas fa-star text-warning"></i>';
                } else {
                    starsHTML += '<i class="far fa-star text-warning"></i>';
                }
            }

            const date = new Date(review.created_at).toLocaleDateString();

            reviewElement.innerHTML = `
                <div class="d-flex justify-content-between mb-2">
                    <div>
                        <h6 class="mb-0">${review.user_name || 'Anonymous'}</h6>
                        <div class="text-muted small">
                            ${starsHTML}
                            <span class="ms-2">${date}</span>
                        </div>
                    </div>
                </div>
                <p>${review.content}</p>
            `;

            reviewsContainer.appendChild(reviewElement);
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('productReviews').innerHTML = '<p class="text-danger">Failed to load reviews. Please try again later.</p>';
    }
}

async function loadRelatedProducts(category) {
    try {
        const response = await fetch(`/api/products?category=${category}&limit=4`);
        if (!response.ok) {
            throw new Error('Failed to load related products');
        }

        const products = await response.json();

        const container = document.getElementById('relatedProducts');
        container.innerHTML = '';

        products.forEach(product => {
            // Skip current product
            if (product.id === currentProduct.id) return;

            const col = document.createElement('div');
            col.className = 'col-6 col-md-3';
            col.innerHTML = `
                <div class="card h-100 border-0 shadow-sm product-card">
                    <a href="product_detail.html?id=${product.id}">
                        <img src="${product.image_url || '/frontend/static/images/product-placeholder.jpg'}" 
                             class="card-img-top" 
                             alt="${product.name}">
                    </a>
                    <div class="card-body">
                        <h6 class="card-title">
                            <a href="product_detail.html?id=${product.id}" class="text-dark text-decoration-none">
                                ${product.name}
                            </a>
                        </h6>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold text-dark">${formatCurrency(product.price)}</span>
                            <div class="product-rating">
                                ${getStarRating(product.average_rating || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(col);
        });

        if (container.children.length === 0) {
            document.getElementById('relatedProductsSection').classList.add('d-none');
        } else {
            document.getElementById('relatedProductsSection').classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error loading related products:', error);
        document.getElementById('relatedProductsSection').classList.add('d-none');
    }
}

function getStarRating(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += '<i class="fas fa-star text-warning"></i>';
        } else if (i - 0.5 <= rating) {
            starsHTML += '<i class="fas fa-star-half-alt text-warning"></i>';
        } else {
            starsHTML += '<i class="far fa-star text-warning"></i>';
        }
    }
    return starsHTML;
}

async function addToCart() {
    const user = getCurrentUser();

    // Check if user is logged in
    if (!user) {
        showLoginModal('Please log in to add items to your cart');
        return;
    }

    // Validate product is in stock
    if (!currentProduct.in_stock) {
        showToast('Sorry, this product is out of stock', 'error');
        return;
    }

    // Check if size is required but not selected
    if (currentProduct.sizes && currentProduct.sizes.length > 0 && !selectedSize) {
        showToast('Please select a size', 'warning');
        return;
    }

    // Check if color is required but not selected
    if (currentProduct.colors && currentProduct.colors.length > 0 && !selectedColor) {
        showToast('Please select a color', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
                product_id: currentProduct.id,
                quantity: currentQuantity,
                size: selectedSize,
                color: selectedColor
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add to cart');
        }

        showToast('Product added to your cart!', 'success');
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Error adding to cart. Please try again.', 'error');
    }
}

async function toggleWishlist() {
    const user = getCurrentUser();

    // Check if user is logged in
    if (!user) {
        showLoginModal('Please log in to add items to your wishlist');
        return;
    }

    const wishlistBtn = document.getElementById('wishlistBtn');
    const isInWishlist = wishlistBtn.classList.contains('active');

    try {
        if (isInWishlist) {
            // Remove from wishlist
            const response = await fetch('/api/wishlist/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    item_id: wishlistBtn.getAttribute('data-wishlist-item-id')
                })
            });

            if (!response.ok) {
                throw new Error('Failed to remove from wishlist');
            }

            wishlistBtn.classList.remove('active');
            wishlistBtn.innerHTML = '<i class="far fa-heart"></i> Add to Wishlist';
            showToast('Removed from your wishlist', 'success');
        } else {
            // Add to wishlist
            const response = await fetch('/api/wishlist/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    product_id: currentProduct.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add to wishlist');
            }

            const data = await response.json();

            // Find the item in the wishlist
            const wishlistItem = data.items.find(item => item.product_id === currentProduct.id);
            if (wishlistItem) {
                wishlistBtn.setAttribute('data-wishlist-item-id', wishlistItem.id);
            }

            wishlistBtn.classList.add('active');
            wishlistBtn.innerHTML = '<i class="fas fa-heart"></i> In Wishlist';
            showToast('Added to your wishlist', 'success');
        }
    } catch (error) {
        console.error('Error updating wishlist:', error);
        showToast('Error updating wishlist. Please try again.', 'error');
    }
}

async function checkWishlistStatus(productId) {
    const user = getCurrentUser();

    if (!user) {
        // User not logged in, no need to check
        return;
    }

    try {
        const response = await fetch('/api/wishlist', {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get wishlist');
        }

        const wishlist = await response.json();
        const wishlistItem = wishlist.items.find(item => item.product_id === productId);

        const wishlistBtn = document.getElementById('wishlistBtn');

        if (wishlistItem) {
            wishlistBtn.classList.add('active');
            wishlistBtn.innerHTML = '<i class="fas fa-heart"></i> In Wishlist';
            wishlistBtn.setAttribute('data-wishlist-item-id', wishlistItem.id);
        } else {
            wishlistBtn.classList.remove('active');
            wishlistBtn.innerHTML = '<i class="far fa-heart"></i> Add to Wishlist';
        }
    } catch (error) {
        console.error('Error checking wishlist status:', error);
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Login modal
function showLoginModal(message) {
    const loginModal = new bootstrap.Modal(document.getElementById('loginRequiredModal'));
    document.getElementById('loginModalMessage').textContent = message;
    loginModal.show();
}