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
    if (!productName || !productDescription || isNaN(product