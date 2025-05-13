// Format tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hiển thị thông báo
function showAlert(message, type) {
    const alertContainer = document.createElement('div');
    alertContainer.className = 'alert-container';
    alertContainer.style.position = 'fixed';
    alertContainer.style.top = '20px';
    alertContainer.style.right = '20px';
    alertContainer.style.zIndex = '9999';

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertContainer.appendChild(alertDiv);
    document.body.appendChild(alertContainer);

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        const alert = bootstrap.Alert.getInstance(alertDiv);
        if (alert) {
            alert.close();
        } else {
            alertContainer.remove();
        }
    }, 5000);
}

// Cập nhật trạng thái người dùng trong header
function updateUserState() {
    const token = localStorage.getItem('accessToken');
    const userDropdown = document.getElementById('userDropdown');

    if (token) {
        // Giải mã token để lấy thông tin user (đơn giản, không an toàn)
        // Trong thực tế, nên sử dụng endpoint để lấy thông tin user
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.role;
            const userName = payload.name || 'User';

            userDropdown.innerHTML = `
                <a class="nav-link dropdown-toggle" href="#" id="userMenuDropdown" role="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user"></i> ${userName}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/profile.html">My Profile</a></li>
                    <li><a class="dropdown-item" href="/orders.html">My Orders</a></li>
                    ${role === 'seller' ? '<li><a class="dropdown-item" href="/seller_dashboard.html">Seller Dashboard</a></li>' : ''}
                    ${role === 'admin' ? '<li><a class="dropdown-item" href="/admin_dashboard.html">Admin Dashboard</a></li>' : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                </ul>
            `;

            // Thêm event listener cho nút logout
            document.getElementById('logoutBtn').addEventListener('click', logout);
        } catch (error) {
            console.error('Error parsing token:', error);
            userDropdown.innerHTML = `<a class="nav-link" href="/login.html"><i class="fas fa-user"></i> Login</a>`;
        }
    } else {
        userDropdown.innerHTML = `<a class="nav-link" href="/login.html"><i class="fas fa-user"></i> Login</a>`;
    }
}

// Đăng xuất
async function logout(e) {
    e.preventDefault();

    const token = localStorage.getItem('accessToken');

    try {
        // Gọi API logout
        await fetch('/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Xóa token và chuyển hướng về trang chủ
        localStorage.removeItem('accessToken');
        window.location.href = '/';

    } catch (error) {
        console.error('Error logging out:', error);

        // Xóa token ngay cả khi API gặp lỗi
        localStorage.removeItem('accessToken');
        window.location.href = '/';
    }
}

// Cập nhật số lượng sản phẩm trong giỏ hàng
async function updateCartCount() {
    const token = localStorage.getItem('accessToken');
    const cartCountElement = document.getElementById('cartCount');

    if (!token || !cartCountElement) return;

    try {
        const response = await fetch('/cart', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cart');
        }

        const cart = await response.json();

        // Tính tổng số lượng sản phẩm trong giỏ hàng
        let totalItems = 0;
        if (cart.items && Array.isArray(cart.items)) {
            totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
        }

        // Cập nhật số lượng hiển thị
        cartCountElement.textContent = totalItems;

    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}