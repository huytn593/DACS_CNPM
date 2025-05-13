// Token từ localStorage (đã lưu sau khi đăng nhập)
const token = localStorage.getItem('accessToken');

// Kiểm tra xem người dùng có token và là seller không
if (!token) {
    window.location.href = '/login.html';
}

// Headers cho các request API
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// Fetch sản phẩm của seller
async function fetchSellerProducts() {
    try {
        const response = await fetch('/seller/products', {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load products. Please try again later.', 'danger');
    }
}

// Hiển thị sản phẩm trong bảng
function displayProducts(products) {
    const tableBody = document.getElementById('productsTable');
    tableBody.innerHTML = '';

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No products found. Add your first product!</td>
            </tr>
        `;
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${product.id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${product.id}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Thêm event listeners cho các nút chỉnh sửa và xóa
    addProductEventListeners();
}

// Thêm sản phẩm mới
async function addProduct(productData) {
    try {
        const response = await fetch('/seller/products', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error('Failed to add product');
        }

        const newProduct = await response.json();
        showAlert('Product added successfully!', 'success');
        fetchSellerProducts(); // Refresh the products list
        return newProduct;
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to add product. Please try again.', 'danger');
        return null;
    }
}

// Cập nhật sản phẩm
async function updateProduct(productId, productData) {
    try {
        const response = await fetch(`/seller/products/${productId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error('Failed to update product');
        }

        const updatedProduct = await response.json();
        showAlert('Product updated successfully!', 'success');
        fetchSellerProducts(); // Refresh the products list
        return updatedProduct;
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to update product. Please try again.', 'danger');
        return null;
    }
}

// Xóa sản phẩm
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return false;
    }

    try {
        const response = await fetch(`/seller/products/${productId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Failed to delete product');
        }

        showAlert('Product deleted successfully!', 'success');
        fetchSellerProducts(); // Refresh the products list
        return true;
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to delete product. Please try again.', 'danger');
        return false;
    }
}

// Xử lý form thêm sản phẩm
document.getElementById('saveProductBtn').addEventListener('click', () => {
    const productName = document.getElementById('productName').value;
    const productDescription = document.getElementById('productDescription').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productStock = parseInt(document.getElementById('productStock').value);
    const productCategory = document.getElementById('productCategory').value;

    // Lấy các kích thước đã chọn
    const selectedSizes = [];
    document.querySelectorAll('.size-checkbox:checked').forEach(checkbox => {
        selectedSizes.push(checkbox.value);
    });

    // Lấy các màu sắc đã chọn
    const selectedColors = [];
    document.querySelectorAll('.color-checkbox:checked').forEach(checkbox => {
        selectedColors.push(checkbox.value);
    });

    // Validate input
    if (!productName || !productDescription || isNaN(productPrice) || isNaN(productStock) || !productCategory) {
        showAlert('Please fill all required fields', 'danger');
        return;
    }

    if (selectedSizes.length === 0) {
        showAlert('Please select at least one size', 'danger');
        return;
    }

    if (selectedColors.length === 0) {
        showAlert('Please select at least one color', 'danger');
        return;
    }

    // Tạo đối tượng sản phẩm mới
    const newProduct = {
        name: productName,
        description: productDescription,
        price: productPrice,
        stock: productStock,
        category: productCategory,
        size: selectedSizes,
        color: selectedColors
    };

    // Gọi API để thêm sản phẩm
    addProduct(newProduct)
        .then(product => {
            if (product) {
                // Đóng modal và reset form nếu thêm sản phẩm thành công
                const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
                modal.hide();
                document.getElementById('addProductForm').reset();
            }
        });
});

// Thêm event listeners cho các nút chỉnh sửa và xóa
function addProductEventListeners() {
    // Event listeners cho nút Edit
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            openEditProductModal(productId);
        });
    });

    // Event listeners cho nút Delete
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

// Mở modal chỉnh sửa sản phẩm và điền thông tin sản phẩm đã có
async function openEditProductModal(productId) {
    try {
        const response = await fetch(`/seller/products/${productId}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Failed to fetch product details');
        }

        const product = await response.json();

        // Thêm code để điền thông tin sản phẩm vào form chỉnh sửa
        // và hiển thị modal chỉnh sửa
        // ...

    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load product details', 'danger');
    }
}

// Hiển thị thông báo
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Thêm thông báo vào đầu trang
    const mainContent = document.querySelector('main');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);

    // Tự động ẩn thông báo sau 5 giây
    setTimeout(() => {
        const alert = bootstrap.Alert.getInstance(alertDiv);
        if (alert) {
            alert.close();
        } else {
            alertDiv.remove();
        }
    }, 5000);
}

// Format tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Tải dữ liệu thống kê
async function loadStatistics() {
    try {
        // Fetch dữ liệu cho biểu đồ sản phẩm bán ra
        const productsSoldResponse = await fetch('/seller/stats/products-sold', {
            method: 'GET',
            headers: headers
        });

        // Fetch dữ liệu cho biểu đồ doanh thu
        const revenueResponse = await fetch('/seller/stats/revenue', {
            method: 'GET',
            headers: headers
        });

        // Fetch dữ liệu cho biểu đồ sản phẩm bán chạy
        const topProductsResponse = await fetch('/seller/stats/top-products', {
            method: 'GET',
            headers: headers
        });

        if (!productsSoldResponse.ok || !revenueResponse.ok || !topProductsResponse.ok) {
            throw new Error('Failed to fetch statistics data');
        }

        const productsSoldData = await productsSoldResponse.json();
        const revenueData = await revenueResponse.json();
        const topProductsData = await topProductsResponse.json();

        // Vẽ biểu đồ với dữ liệu từ API
        createProductsSoldChart(productsSoldData);
        createRevenueChart(revenueData);
        createTopProductsChart(topProductsData);

    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load statistics. Please try again later.', 'danger');
    }
}

// Vẽ biểu đồ sản phẩm bán ra
function createProductsSoldChart(data) {
    const ctx = document.getElementById('productsSoldChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Products Sold',
                data: data.values,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Vẽ biểu đồ doanh thu
function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Revenue (VND)',
                data: data.values,
                fill: false,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Vẽ biểu đồ sản phẩm bán chạy
function createTopProductsChart(data) {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        }
    });
}

// Fetch đơn hàng của seller
async function fetchSellerOrders() {
    try {
        const response = await fetch('/seller/orders', {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        const orders = await response.json();
        displayOrders(orders);
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load orders. Please try again later.', 'danger');
    }
}

// Hiển thị đơn hàng trong bảng
function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTable');
    tableBody.innerHTML = '';

    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No orders found.</td>
            </tr>
        `;
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id.substring(0, 8)}...</td>
            <td>${order.user_name}</td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>${formatCurrency(order.total_price)}</td>
            <td><span class="badge bg-${getStatusColor(order.status)}">${order.status}</span></td>
            <td>
                <button class="btn btn-sm btn-info view-order-btn" data-id="${order.id}">View</button>
                ${order.status === 'pending' ? `<button class="btn btn-sm btn-success ship-order-btn" data-id="${order.id}">Ship</button>` : ''}
                ${order.status === 'shipped' ? `<button class="btn btn-sm btn-primary complete-order-btn" data-id="${order.id}">Complete</button>` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Thêm event listeners cho các nút quản lý đơn hàng
    addOrderEventListeners();
}

// Lấy màu tương ứng với trạng thái đơn hàng
function getStatusColor(status) {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'shipped':
            return 'info';
        case 'completed':
            return 'success';
        default:
            return 'secondary';
    }
}

// Khởi tạo trang khi load xong
document.addEventListener('DOMContentLoaded', () => {
    fetchSellerProducts();
    fetchSellerOrders();
    loadStatistics();

    // Chuyển đổi giữa các tab
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);

            // Ẩn tất cả các phần nội dung
            document.querySelectorAll('main > div').forEach(div => {
                div.style.display = 'none';
            });

            // Hiển thị phần được chọn
            document.getElementById(targetId).style.display = 'block';

            // Cập nhật trạng thái active của nav-link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            e.target.classList.add('active');
        });
    });

    // Hiển thị tab mặc định (products)
    document.querySelector('.nav-link.active').click();
});
