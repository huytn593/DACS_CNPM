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