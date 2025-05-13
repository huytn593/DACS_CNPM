// Kiểm tra quyền truy cập
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        // Chuyển hướng về trang đăng nhập
        window.location.href = '/login.html?returnUrl=' + encodeURIComponent('/seller_dashboard.html');
        return;
    }
    
    try {
        // Giải mã token để lấy thông tin vai trò
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role;
        const name = payload.name || 'Seller';
        
        // Hiển thị tên người dùng
        document.getElementById('userName').textContent = name;
        
        if (role !== 'seller') {
            // Không phải seller, chuyển hướng về trang chủ
            alert('Access denied. You need seller privileges to access this page.');
            window.location.href = '/';
            return;
        }
        
        // Khởi tạo dashboard
        initializeDashboard();
        
    } catch (error) {
        console.error('Error parsing token:', error);
        // Chuyển hướng về trang đăng nhập
        window.location.href = '/login.html';
    }
});

// Khởi tạo dashboard
async function initializeDashboard() {
    // Load danh mục sản phẩm
    await loadCategories();
    
    // Load sản phẩm của seller
    await loadSellerProducts();
    
    // Tải dữ liệu tổng quan
    await loadDashboardOverview();
    
    // Tải đơn hàng gần đây
    await loadRecentOrders();
    
    // Thêm event listener cho các tab
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function() {
            // Cập nhật tiêu đề trang
            document.getElementById('pageTitle').textContent = this.textContent.trim();
            
            // Nếu tab là Orders, tải danh sách đơn hàng
            if (this.getAttribute('href') === '#orders') {
                loadOrders();
            }
            // Nếu tab là Reports, tải báo cáo
            else if (this.getAttribute('href') === '#reports') {
                initializeReports();
            }
        });
    });
    
    // Xử lý đăng xuất
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('logoutBtnTop').addEventListener('click', logout);
    
    // Xử lý form thêm sản phẩm
    document.getElementById('addProductForm').addEventListener('submit', handleAddProduct);
    document.getElementById('resetProductFormBtn').addEventListener('click', () => {
        document.getElementById('addProductForm').reset();
    });
    
    // Xử lý lọc và tìm kiếm sản phẩm
    document.getElementById('productSearchBtn').addEventListener('click', () => {
        loadSellerProducts(1);
    });
    
    document.getElementById('productCategoryFilter').addEventListener('change', () => {
        loadSellerProducts(1);
    });
    
    // Xử lý lọc và tìm kiếm đơn hàng
    document.getElementById('orderSearchBtn').addEventListener('click', () => {
        loadOrders(1);
    });
    
    document.getElementById('orderStatusFilter').addEventListener('change', () => {
        loadOrders(1);
    });
    
    document.getElementById('orderDateFilter').addEventListener('change', () => {
        loadOrders(1);
    });
    
    // Xử lý tạo báo cáo
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
}

// Tải danh mục sản phẩm
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        const categories = await response.json();
        
        // Cập nhật select categories trong form thêm sản phẩm
        const productCategorySelect = document.getElementById('productCategory');
        productCategorySelect.innerHTML = '<option value="" selected disabled>Select a category</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            productCategorySelect.appendChild(option);
        });
        
        // Cập nhật select categories trong bộ lọc
        const categoryFilterSelect = document.getElementById('productCategoryFilter');
        categoryFilterSelect.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilterSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load categories', 'danger');
    }
}

// Tải sản phẩm của seller
async function loadSellerProducts(page = 1) {
    const token = localStorage.getItem('accessToken');
    const searchQuery = document.getElementById('productSearchInput').value.trim();
    const categoryFilter = document.getElementById('productCategoryFilter').value;
    
    try {
        // Xây dựng URL với các tham số
        let url = `/seller/products?page=${page}`;
        
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        if (categoryFilter) {
            url += `&category=${categoryFilter}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        const products = data.products;
        const totalPages = data.total_pages;
        
        // Cập nhật số lượng sản phẩm trong dashboard
        document.getElementById('productCount').textContent = data.total_products || 0;
        
        // Hiển thị sản phẩm
        displayProducts(products);
        
        // Tạo phân trang
        createPagination(page, totalPages, 'productsPagination', loadSellerProducts);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('productsList').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">Failed to load products. Please try again.</td>
            </tr>
        `;
    }
}

// Hiển thị danh sách sản phẩm
function displayProducts(products) {
    const productsListElement = document.getElementById('productsList');
    
    if (products.length === 0) {
        productsListElement.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No products found</td>
            </tr>
        `;
        return;
    }
    
    productsListElement.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        
        // Xác định trạng thái sản phẩm
        let statusBadge = '';
        if (product.stock <= 0) {
            statusBadge = '<span class="badge bg-danger">Out of Stock</span>';
        } else if (product.stock < 10) {
            statusBadge = '<span class="badge bg-warning text-dark">Low Stock</span>';
        } else {
            statusBadge = '<span class="badge bg-success">In Stock</span>';
        }
        
        row.innerHTML = `
            <td>
                <img src="${product.image || '/static/images/product-placeholder.jpg'}" class="img-thumbnail" width="50" alt="${product.name}">
            </td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.stock}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary edit-product-btn" data-product-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger delete-product-btn" data-product-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        productsListElement.appendChild(row);
    });
    
    // Thêm event listeners cho các nút
    addProductButtonEventListeners();
}

// Thêm event listeners cho các nút trong bảng sản phẩm
function addProductButtonEventListeners() {
    // Nút chỉnh sửa sản phẩm
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.getAttribute('data-product-id');
            openEditProductModal(productId);
        });
    });
    
    // Nút xóa sản phẩm
    document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.getAttribute('data-product-id');
            confirmDeleteProduct(productId);
        });
    });
}

// Mở modal chỉnh sửa sản phẩm
async function openEditProductModal(productId) {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch(`/seller/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }
        
        const product = await response.json();
        
        // Fill form với thông tin sản phẩm
        document.getElementById('editProductId').value = product.id;
        // Thêm code để điền thông tin sản phẩm vào form trong modal
        
        // Hiển thị modal
        const editProductModal = new bootstrap.Modal(document.getElementById('editProductModal'));
        editProductModal.show();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load product details', 'danger');
    }
}

// Xác nhận xóa sản phẩm
function confirmDeleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        deleteProduct(productId);
    }
}

// Xóa sản phẩm
async function deleteProduct(productId) {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch(`/seller/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete product');
        }
        
        // Hiển thị thông báo thành công
        showAlert('Product deleted successfully', 'success');
        
        // Tải lại danh sách sản phẩm
        loadSellerProducts();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to delete product', 'danger');
    }
}

// Xử lý thêm sản phẩm mới
async function handleAddProduct(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('accessToken');
    
    // Lấy dữ liệu từ form
    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const category = document.getElementById('productCategory').value;
    
    // Lấy size đã chọn
    const selectedSizes = [];
    document.querySelectorAll('.size-options input[type="checkbox"]:checked').forEach(checkbox => {
        selectedSizes.push(checkbox.value);
    });
    
    // Lấy màu sắc đã chọn
    const selectedColors = [];
    document.querySelectorAll('.color-options input[type="checkbox"]:checked').forEach(checkbox => {
        selectedColors.push(checkbox.value);
    });
    
    // Kiểm tra dữ liệu
    if (selectedSizes.length === 0) {
        showAlert('Please select at least one size', 'warning');
        return;
    }
    
    if (selectedColors.length === 0) {
        showAlert('Please select at least one color', 'warning');
        return;
    }
    
    // Tạo đối tượng sản phẩm
    const productData = {
        name: name,
        description: description,
        price: price,
        stock: stock,
        category: category,
        size: selectedSizes,
        color: selectedColors
    };
    
    try {
        const response = await fetch('/seller/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add product');
        }
        
        // Xử lý upload hình ảnh (nếu có)
        const imageInput = document.getElementById('productImage');
        if (imageInput.files.length > 0) {
            const productResult = await response.json();
            const productId = productResult.id;
            
            // Upload hình ảnh
            await uploadProductImage(productId, imageInput.files[0]);
        }
        
        // Hiển thị thông báo thành công
        showAlert('Product added successfully', 'success');
        
        // Reset form
        document.getElementById('addProductForm').reset();
        
        // Tải lại danh sách sản phẩm
        loadSellerProducts();
        
        // Chuyển về tab sản phẩm
        document.querySelector('a[href="#products"]').click();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to add product', 'danger');
    }
}

// Upload hình ảnh sản phẩm
async function uploadProductImage(productId, file) {
    const token = localStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`/seller/products/${productId}/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload product image');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Product added but failed to upload image', 'warning');
    }
}

// Tải dữ liệu tổng quan cho dashboard
async function loadDashboardOverview() {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch('/seller/dashboard/overview', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        
        // Cập nhật các thông số
        document.getElementById('productCount').textContent = data.total_products || 0;
        document.getElementById('orderCount').textContent = data.total_orders || 0;
        document.getElementById('totalRevenue').textContent = formatCurrency(data.total_revenue || 0);
        
    } catch (error) {
        console.error('Error:', error);
        // Không hiển thị thông báo lỗi cho người dùng
    }
}

// Tải đơn hàng gần đây
async function loadRecentOrders() {
    const token = localStorage.getItem('accessToken');
    
    try {
        const response = await fetch('/seller/orders/recent', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch recent orders');
        }
        
        const orders = await response.json();
        
        const recentOrdersList = document.getElementById('recentOrdersList');
        
        if (orders.length === 0) {
            recentOrdersList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No recent orders</td>
                </tr>
            `;
            return;
        }
        
        recentOrdersList.innerHTML = '';
        
        orders.forEach(order => {
            const statusBadge = getStatusBadge(order.status);
            const date = new Date(order.created_at).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id.substring(0, 8)}</td>
                <td>${date}</td>
                <td>${order.customer_name || 'Anonymous'}</td>
                <td>${statusBadge}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-order-btn" data-order-id="${order.id}">
                        View
                    </button>
                </td>
            `;
            
            recentOrdersList.appendChild(row);
        });
        
        // Thêm event listeners cho các nút
        document.querySelectorAll('.view-order-btn').forEach(button => {
            button.addEventListener('click', () => {
                const orderId = button.getAttribute('data-order-id');
                openOrderDetailsModal(orderId);
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('recentOrdersList').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">Failed to load recent orders</td>
            </tr>
        `;
    }
}

// Lấy badge cho trạng thái đơn hàng
function getStatusBadge(status) {
    switch (status.toLowerCase()) {
        case 'pending':
            return '<span class="badge bg-warning text-dark">Pending</span>';
        case 'processing':
            return '<span class="badge bg-info">Processing</span>';
        case 'shipped':
            return '<span class="badge bg-primary">Shipped</span>';
        case 'delivered':
            return '<span class="badge bg-success">Delivered</span>';
        case 'cancelled':
            return '<span class="badge bg-danger">Cancelled</span>';
        default:
            return '<span class="badge bg-secondary">Unknown</span>';
    }
}

// Tạo phân trang
function createPagination(currentPage, totalPages, paginationElementId, loadFunction) {
    const paginationElement = document.getElementById(paginationElementId);
    paginationElement.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Nút Previous
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.textContent = 'Previous';
    prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            loadFunction(currentPage - 1);
        }
    });
    
    prevLi.appendChild(prevLink);
    paginationElement.appendChild(prevLi);
    
    // Các nút số trang
    for (let i = 1; i <= totalPages; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
        
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadFunction(i);
        });
        
        pageLi.appendChild(pageLink);
        paginationElement.appendChild(pageLi);
    }
    
    // Nút Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.textContent = 'Next';
    nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            loadFunction(currentPage + 1);
        }
    });
    
    nextLi.appendChild(nextLink);
    paginationElement.appendChild(nextLi);
}

// Định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hiển thị thông báo
function showAlert(message, type = 'info') {
    // Tạo một alert và append vào body
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertElement.style.top = '20px';
    alertElement.style.right = '20px';
    alertElement.style.zIndex = '9999';
    
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertElement);
    
    // Tự động ẩn alert sau 5 giây
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    }, 5000);
}

// Đăng xuất
function logout() {
    // Xóa token
    localStorage.removeItem('accessToken');
    
    // Chuyển hướng về trang đăng nhập
    window.location.href = '/login.html';
}