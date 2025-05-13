// Kiểm tra quyền truy cập
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        // Chuyển hướng về trang đăng nhập
        window.location.href = '/login.html?returnUrl=' + encodeURIComponent('/admin_dashboard.html');
        return;
    }

    try {
        // Giải mã token để lấy thông tin vai trò
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = payload.role;
        const name = payload.name || 'Admin';

        // Hiển thị tên admin
        document.getElementById('adminName').textContent = name;

        if (role !== 'admin') {
            // Không phải admin, chuyển hướng về trang chủ
            alert('Access denied. You need admin privileges to access this page.');
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
    // Tải tổng quan dashboard
    await loadDashboardOverview();

    // Tải các biểu đồ
    loadCharts();

    // Tải danh sách đơn hàng gần đây
    await loadRecentOrders();

    // Tải danh mục sản phẩm
    await loadCategories();

    // Thêm event listener cho các tab
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function() {
            // Cập nhật tiêu đề trang
            document.getElementById('pageTitle').textContent = this.textContent.trim();

            // Load dữ liệu tương ứng với tab
            const tabId = this.getAttribute('href').substring(1);

            switch(tabId) {
                case 'products':
                    loadProducts();
                    break;
                case 'categories':
                    loadCategoriesList();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'reports':
                    setupReportDateRange();
                    break;
            }
        });
    });

    // Khởi tạo sự kiện cho các forms
    initializeForms();

    // Xử lý đăng xuất
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('logoutBtnTop').addEventListener('click', logout);
}

// Khởi tạo sự kiện cho các forms
function initializeForms() {
    // Form thêm sản phẩm
    document.getElementById('saveProductBtn').addEventListener('click', handleAddProduct);

    // Form chỉnh sửa sản phẩm
    document.getElementById('updateProductBtn').addEventListener('click', handleUpdateProduct);

    // Form thêm người dùng
    document.getElementById('saveUserBtn').addEventListener('click', handleAddUser);

    // Form danh mục
    document.getElementById('categoryForm').addEventListener('submit', handleSaveCategory);
    document.getElementById('resetCategoryBtn').addEventListener('click', resetCategoryForm);

    // Form cài đặt cửa hàng
    document.getElementById('storeSettingsForm').addEventListener('submit', handleSaveStoreSettings);

    // Form hồ sơ admin
    document.getElementById('adminProfileForm').addEventListener('submit', handleSaveAdminProfile);

    // Các nút lọc và tìm kiếm
    document.getElementById('productSearchBtn').addEventListener('click', () => loadProducts(1));
    document.getElementById('productCategoryFilter').addEventListener('change', () => loadProducts(1));
    document.getElementById('productStatusFilter').addEventListener('change', () => loadProducts(1));

    document.getElementById('orderSearchBtn').addEventListener('click', () => loadOrders(1));
    document.getElementById('orderStatusFilter').addEventListener('change', () => loadOrders(1));
    document.getElementById('orderStartDate').addEventListener('change', () => loadOrders(1));
    document.getElementById('orderEndDate').addEventListener('change', () => loadOrders(1));

    document.getElementById('userSearchBtn').addEventListener('click', () => loadUsers(1));
    document.getElementById('userRoleFilter').addEventListener('change', () => loadUsers(1));
    document.getElementById('userStatusFilter').addEventListener('change', () => loadUsers(1));

    // Nút tạo báo cáo
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    document.getElementById('printReportBtn').addEventListener('click', printReport);
    document.getElementById('exportReportBtn').addEventListener('click', exportReport);
}

// Tải tổng quan dashboard
async function loadDashboardOverview() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/admin/dashboard/overview', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();

        // Cập nhật các thông số
        document.getElementById('totalProducts').textContent = data.total_products || 0;
        document.getElementById('totalOrders').textContent = data.total_orders || 0;
        document.getElementById('totalUsers').textContent = data.total_users || 0;
        document.getElementById('totalRevenue').textContent = formatCurrency(data.total_revenue || 0);

    } catch (error) {
        console.error('Error:', error);
        // Không hiển thị thông báo lỗi cho người dùng
    }
}

// Tạo các biểu đồ
function loadCharts() {
    // Biểu đồ doanh thu
    createRevenueChart();

    // Biểu đồ danh mục sản phẩm
    createCategoryChart();
}

// Tạo biểu đồ doanh thu
async function createRevenueChart() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/admin/reports/revenue', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch revenue data');
        }

        const data = await response.json();

        // Chuẩn bị dữ liệu cho biểu đồ
        const months = data.map(item => item.month);
        const revenues = data.map(item => item.revenue);

        // Tạo biểu đồ
        const ctx = document.getElementById('revenueChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Revenue (VND)',
                    data: revenues,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrencyCompact(value);
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('revenueChart').parentElement.innerHTML = 'Failed to load revenue chart data';
    }
}

// Tạo biểu đồ danh mục sản phẩm
async function createCategoryChart() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/admin/reports/categories', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch category data');
        }

        const data = await response.json();

        // Chuẩn bị dữ liệu cho biểu đồ
        const categories = data.map(item => item.name);
        const productCounts = data.map(item => item.count);

        // Màu sắc cho biểu đồ
        const backgroundColors = [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)'
        ];

        // Tạo biểu đồ
        const ctx = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: productCounts,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('categoryChart').parentElement.innerHTML = 'Failed to load category chart data';
    }
}

// Tải đơn hàng gần đây
async function loadRecentOrders() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/admin/orders/recent', {
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
                <td>#${order.order_number.substring(0, 8)}</td>
                <td>${date}</td>
                <td>${order.shipping_info.full_name || 'Anonymous'}</td>
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

// Tải danh mục sản phẩm
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        const categories = await response.json();
        
        // Cập nhật select trong modal thêm sản phẩm
        const productCategorySelect = document.getElementById('productCategory');
        productCategorySelect.innerHTML = '<option value="" selected disabled>Select a category</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            productCategorySelect.appendChild(option);
        });
        
        // Cập nhật select cho modal chỉnh sửa sản phẩm
        const editProductCategorySelect = document.getElementById('editProductCategory');
        editProductCategorySelect.innerHTML = '<option value="" selected disabled>Select a category</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            editProductCategorySelect.appendChild(option);
        });
        
        // Cập nhật select cho bộ lọc sản phẩm
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

// Tải danh sách sản phẩm
async function loadProducts(page = 1) {
    const token = localStorage.getItem('accessToken');
    const searchQuery = document.getElementById('productSearchInput').value.trim();
    const categoryFilter = document.getElementById('productCategoryFilter').value;
    const statusFilter = document.getElementById('productStatusFilter').value;
    
    try {
        // Xây dựng URL với các tham số
        let url = `/admin/products?page=${page}`;
        
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        if (categoryFilter) {
            url += `&category=${categoryFilter}`;
        }
        
        if (statusFilter) {
            url += `&status=${statusFilter}`;
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
        
        // Hiển thị sản phẩm
        displayProducts(products);
        
        // Tạo phân trang
        createPagination(page, totalPages, 'productsPagination', loadProducts);
        
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
        const response = await fetch(`/admin/products/${productId}`, {
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
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductDescription').value = product.description;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductStock').value = product.stock;
        document.getElementById('editProductCategory').value = product.category_id;
        
        // Hiển thị hình ảnh sản phẩm hiện tại
        if (product.image) {
            document.getElementById('currentProductImage').src = product.image;
        } else {
            document.getElementById('currentProductImage').src = '/static/images/product-placeholder.jpg';
        }
        
        // Chọn các size có sẵn
        document.querySelectorAll('.edit-size-options input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = product.size.includes(checkbox.value);
        });
        
        // Chọn các màu có sẵn
        document.querySelectorAll('.edit-color-options input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = product.color.includes(checkbox.value);
        });
        
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
        const response = await fetch(`/admin/products/${productId}`, {
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
        loadProducts();
        
        // Cập nhật tổng quan dashboard
        loadDashboardOverview();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to delete product', 'danger');
    }
}

// Xử lý thêm sản phẩm mới
async function handleAddProduct() {
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
    if (!name || !description || isNaN(price) || isNaN(stock) || !category) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
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
        category_id: category,
        size: selectedSizes,
        color: selectedColors
    };
    
    try {
        const response = await fetch('/admin/products', {
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
        
        const result = await response.json();
        
        // Xử lý upload hình ảnh (nếu có)
        const imageInput = document.getElementById('productImage');
        if (imageInput.files.length > 0) {
            await uploadProductImage(result.id, imageInput.files[0]);
        }
        
        // Hiển thị thông báo thành công
        showAlert('Product added successfully', 'success');
        
        // Đóng modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
        modal.hide();
        
        // Reset form
        document.getElementById('addProductForm').reset();
        
        // Tải lại danh sách sản phẩm
        loadProducts();
        
        // Cập nhật tổng quan dashboard
        loadDashboardOverview();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to add product', 'danger');
    }
}

// Cập nhật sản phẩm
async function handleUpdateProduct() {
    const token = localStorage.getItem('accessToken');
    const productId = document.getElementById('editProductId').value;
    
    // Lấy dữ liệu từ form
    const name = document.getElementById('editProductName').value;
    const description = document.getElementById('editProductDescription').value;
    const price = parseFloat(document.getElementById('editProductPrice').value);
    const stock = parseInt(document.getElementById('editProductStock').value);
    const category = document.getElementById('editProductCategory').value;
    
    // Lấy size đã chọn
    const selectedSizes = [];
    document.querySelectorAll('.edit-size-options input[type="checkbox"]:checked').forEach(checkbox => {
        selectedSizes.push(checkbox.value);
    });
    
    // Lấy màu sắc đã chọn
    const selectedColors = [];
    document.querySelectorAll('.edit-color-options input[type="checkbox"]:checked').forEach(checkbox => {
        selectedColors.push(checkbox.value);
    });
    
    // Kiểm tra dữ liệu
    if (!name || !description || isNaN(price) || isNaN(stock) || !category) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
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
        category_id: category,
        size: selectedSizes,
        color: selectedColors
    };
    
    try {
        const response = await fetch(`/admin/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update product');
        }
        
        // Xử lý upload hình ảnh (nếu có)
        const imageInput = document.getElementById('editProductImage');
        if (imageInput.files.length > 0) {
            await uploadProductImage(productId, imageInput.files[0]);
        }
        
        // Hiển thị thông báo thành công
        showAlert('Product updated successfully', 'success');
        
        // Đóng modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
        modal.hide();
        
        // Tải lại danh sách sản phẩm
        loadProducts();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to update product', 'danger');
    }
}

// Upload hình ảnh sản phẩm
async function uploadProductImage(productId, file) {
    const token = localStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`/admin/products/${productId}/image`, {
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
        showAlert('Failed to upload product image', 'warning');
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
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
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

// Định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Định dạng tiền tệ compact (cho biểu đồ)
function formatCurrencyCompact(amount) {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1) + 'B ₫';
    } else if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M ₫';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'K ₫';
    }
    return amount + ' ₫';
}

// Đăng xuất
function logout() {
    // Xóa token
    localStorage.removeItem('accessToken');
    
    // Chuyển hướng về trang đăng nhập
    window.location.href = '/login.html';
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