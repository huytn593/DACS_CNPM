// Lưu thông tin đơn hàng
let orderData = {
    shippingInfo: {},
    paymentMethod: 'cod',
    cardDetails: {},
    items: [],
    subtotal: 0,
    shipping: 30000,
    total: 0
};

// Khởi tạo quá trình thanh toán
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('accessToken');

    if (!token) {
        // Chuyển hướng đến trang đăng nhập
        window.location.href = '/login.html?returnUrl=' + encodeURIComponent('/checkout.html');
        return;
    }

    // Tải giỏ hàng
    await loadCart();

    // Cập nhật trạng thái người dùng trong header
    updateUserState();

    // Load thông tin mặc định từ hồ sơ người dùng
    await loadUserProfile();

    // Thêm event listener cho form shipping
    document.getElementById('shippingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveShippingInfo();
        goToPaymentStep();
    });

    // Thêm event listener cho form payment
    document.getElementById('paymentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        savePaymentInfo();
        goToConfirmationStep();
    });

    // Xử lý nút back
    document.getElementById('backToShippingBtn').addEventListener('click', goToShippingStep);
    document.getElementById('backToPaymentBtn').addEventListener('click', goToPaymentStep);

    // Xử lý thanh toán bằng thẻ
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const cardPaymentDetails = document.getElementById('cardPaymentDetails');
            if (this.value === 'card') {
                cardPaymentDetails.style.display = 'block';
            } else {
                cardPaymentDetails.style.display = 'none';
            }
        });
    });

    // Đồng ý với điều khoản
    document.getElementById('termsAgreement').addEventListener('change', function() {
        document.getElementById('placeOrderBtn').disabled = !this.checked;
    });

    // Xử lý đặt hàng
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);

    // Load danh mục sản phẩm động
    loadCategories();
});

// Tải giỏ hàng
async function loadCart() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cart');
        }

        const cart = await response.json();

        // Nếu giỏ hàng trống, chuyển hướng về trang giỏ hàng
        if (!cart.items || cart.items.length === 0) {
            window.location.href = '/cart.html';
            return;
        }

        // Lưu các sản phẩm trong giỏ hàng vào orderData
        orderData.items = cart.items;

        // Tính toán tổng tiền
        orderData.subtotal = cart.items.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);

        // Tính tổng tiền đơn hàng
        orderData.total = orderData.subtotal + orderData.shipping;

        // Hiển thị tóm tắt đơn hàng
        displayOrderSummary();

    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to load your cart. Please try again later.', 'danger');
    }
}

// Hiển thị tóm tắt đơn hàng
function displayOrderSummary() {
    const orderSummaryElement = document.getElementById('orderSummary');

    const html = `
        <div class="d-flex justify-content-between mb-2">
            <span>Subtotal:</span>
            <span>${formatCurrency(orderData.subtotal)}</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
            <span>Shipping:</span>
            <span>${formatCurrency(orderData.shipping)}</span>
        </div>
        <hr>
        <div class="d-flex justify-content-between mb-4 fw-bold">
            <span>Total:</span>
            <span>${formatCurrency(orderData.total)}</span>
        </div>

        <div class="order-items-summary">
            <h5 class="mb-3">Order Items (${orderData.items.length})</h5>
            ${orderData.items.map(item => `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="d-flex align-items-center">
                        <img src="${item.product.image || '/static/images/product-placeholder.jpg'}" class="img-thumbnail me-2" width="40" height="40" style="object-fit: cover;" alt="${item.product.name}">
                        <div>
                            <p class="mb-0 fw-medium">${item.product.name}</p>
                            <small class="text-muted">Size: ${item.size}, Color: ${item.color}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <p class="mb-0">${item.quantity} x ${formatCurrency(item.product.price)}</p>
                        <p class="mb-0 fw-medium">${formatCurrency(item.product.price * item.quantity)}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    orderSummaryElement.innerHTML = html;
}

// Tải thông tin người dùng
async function loadUserProfile() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Không xử lý lỗi ở đây, người dùng sẽ nhập thông tin từ đầu
            return;
        }

        const profile = await response.json();

        // Điền thông tin vào form
        if (profile.full_name) {
            document.getElementById('fullName').value = profile.full_name;
        }

        if (profile.email) {
            document.getElementById('emailAddress').value = profile.email;
        }

        if (profile.phone) {
            document.getElementById('phoneNumber').value = profile.phone;
        }

        if (profile.address) {
            document.getElementById('address').value = profile.address;
        }

        if (profile.city) {
            document.getElementById('city').value = profile.city;
        }
        
        if (profile.district) {
            document.getElementById('district').value = profile.district;
        }
        
        if (profile.zip_code) {
            document.getElementById('zipCode').value = profile.zip_code;
        }
        
    } catch (error) {
        console.error('Error:', error);
        // Không xử lý lỗi ở đây, người dùng sẽ nhập thông tin từ đầu
    }
}

// Lưu thông tin giao hàng
function saveShippingInfo() {
    orderData.shippingInfo = {
        fullName: document.getElementById('fullName').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        emailAddress: document.getElementById('emailAddress').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        district: document.getElementById('district').value,
        zipCode: document.getElementById('zipCode').value,
        notes: document.getElementById('shippingNotes').value
    };
    
    // Nếu người dùng muốn lưu thông tin cho lần sau
    if (document.getElementById('saveShippingInfo').checked) {
        saveUserAddress();
    }
}

// Lưu địa chỉ người dùng cho lần sau
async function saveUserAddress() {
    const token = localStorage.getItem('accessToken');
    
    try {
        await fetch('/profile/address', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                district: document.getElementById('district').value,
                zip_code: document.getElementById('zipCode').value,
                phone: document.getElementById('phoneNumber').value
            })
        });
        
    } catch (error) {
        console.error('Error:', error);
        // Không xử lý lỗi ở đây, tiếp tục quy trình thanh toán
    }
}

// Lưu thông tin thanh toán
function savePaymentInfo() {
    // Lấy phương thức thanh toán
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    orderData.paymentMethod = paymentMethod;
    
    // Nếu thanh toán bằng thẻ, lưu thông tin thẻ
    if (paymentMethod === 'card') {
        orderData.cardDetails = {
            cardNumber: document.getElementById('cardNumber').value,
            expiryDate: document.getElementById('expiryDate').value,
            cvv: document.getElementById('cvv').value,
            cardholderName: document.getElementById('cardholderName').value
        };
    }
}

// Chuyển đến bước thanh toán
function goToPaymentStep() {
    // Cập nhật progress bar
    document.getElementById('checkoutProgress').style.width = '66%';
    document.getElementById('checkoutProgress').setAttribute('aria-valuenow', '66');
    
    // Chuyển tab
    const paymentTab = document.querySelector('a[href="#payment"]');
    const bsTab = new bootstrap.Tab(paymentTab);
    bsTab.show();
}

// Quay lại bước shipping
function goToShippingStep() {
    // Cập nhật progress bar
    document.getElementById('checkoutProgress').style.width = '33%';
    document.getElementById('checkoutProgress').setAttribute('aria-valuenow', '33');
    
    // Chuyển tab
    const shippingTab = document.querySelector('a[href="#shipping"]');
    const bsTab = new bootstrap.Tab(shippingTab);
    bsTab.show();
}

// Chuyển đến bước xác nhận
function goToConfirmationStep() {
    // Cập nhật progress bar
    document.getElementById('checkoutProgress').style.width = '100%';
    document.getElementById('checkoutProgress').setAttribute('aria-valuenow', '100');
    
    // Chuyển tab
    const confirmationTab = document.querySelector('a[href="#confirmation"]');
    const bsTab = new bootstrap.Tab(confirmationTab);
    bsTab.show();
    
    // Hiển thị tóm tắt đơn hàng trước khi xác nhận
    displayOrderConfirmation();
}

// Quay lại bước payment
function goToPaymentStep() {
    // Cập nhật progress bar
    document.getElementById('checkoutProgress').style.width = '66%';
    document.getElementById('checkoutProgress').setAttribute('aria-valuenow', '66');
    
    // Chuyển tab
    const paymentTab = document.querySelector('a[href="#payment"]');
    const bsTab = new bootstrap.Tab(paymentTab);
    bsTab.show();
}

// Hiển thị thông tin xác nhận đơn hàng
function displayOrderConfirmation() {
    // Hiển thị thông tin giao hàng
    document.getElementById('shippingDetails').innerHTML = `
        <p class="mb-1"><strong>${orderData.shippingInfo.fullName}</strong></p>
        <p class="mb-1">${orderData.shippingInfo.address}</p>
        <p class="mb-1">${orderData.shippingInfo.district}, ${orderData.shippingInfo.city} ${orderData.shippingInfo.zipCode || ''}</p>
        <p class="mb-1">Phone: ${orderData.shippingInfo.phoneNumber}</p>
        <p class="mb-1">Email: ${orderData.shippingInfo.emailAddress}</p>
        ${orderData.shippingInfo.notes ? `<p class="mb-0">Notes: ${orderData.shippingInfo.notes}</p>` : ''}
    `;
    
    // Hiển thị thông tin thanh toán
    let paymentMethodText = '';
    let paymentIcon = '';
    
    switch (orderData.paymentMethod) {
        case 'cod':
            paymentMethodText = 'Cash on Delivery';
            paymentIcon = '<i class="fas fa-money-bill-wave me-2 text-success"></i>';
            break;
        case 'bank':
            paymentMethodText = 'Bank Transfer';
            paymentIcon = '<i class="fas fa-university me-2 text-primary"></i>';
            break;
        case 'card':
            paymentMethodText = 'Credit/Debit Card';
            paymentIcon = '<i class="fas fa-credit-card me-2 text-info"></i>';
            break;
        case 'momo':
            paymentMethodText = 'MoMo Wallet';
            paymentIcon = '<i class="fas fa-wallet me-2 text-danger"></i>';
            break;
    }
    
    document.getElementById('paymentDetails').innerHTML = `
        <p class="mb-1">${paymentIcon} ${paymentMethodText}</p>
        ${orderData.paymentMethod === 'card' ? 
            `<p class="mb-0">Card ending in ${orderData.cardDetails.cardNumber.slice(-4)}</p>` : ''}
    `;
    
    // Hiển thị danh sách sản phẩm
    const orderItemsListElement = document.getElementById('orderItemsList');
    orderItemsListElement.innerHTML = '';
    
    orderData.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${item.product.image || '/static/images/product-placeholder.jpg'}" class="img-thumbnail me-2" style="width: 50px; height: 50px; object-fit: cover;" alt="${item.product.name}">
                    <div>
                        <h6 class="mb-0">${item.product.name}</h6>
                        <small class="text-muted">Size: ${item.size}, Color: ${item.color}</small>
                    </div>
                </div>
            </td>
            <td>${formatCurrency(item.product.price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.product.price * item.quantity)}</td>
        `;
        
        orderItemsListElement.appendChild(row);
    });
    
    // Thêm hàng tổng tiền
    const totalRow = document.createElement('tr');
    totalRow.className = 'table-light';
    totalRow.innerHTML = `
        <td colspan="3" class="text-end fw-bold">Subtotal:</td>
        <td>${formatCurrency(orderData.subtotal)}</td>
    `;
    orderItemsListElement.appendChild(totalRow);
    
    // Thêm hàng phí shipping
    const shippingRow = document.createElement('tr');
    shippingRow.className = 'table-light';
    shippingRow.innerHTML = `
        <td colspan="3" class="text-end fw-bold">Shipping:</td>
        <td>${formatCurrency(orderData.shipping)}</td>
    `;
    orderItemsListElement.appendChild(shippingRow);
    
    // Thêm hàng tổng đơn hàng
    const orderTotalRow = document.createElement('tr');
    orderTotalRow.className = 'table-light';
    orderTotalRow.innerHTML = `
        <td colspan="3" class="text-end fw-bold">Total:</td>
        <td class="fw-bold">${formatCurrency(orderData.total)}</td>
    `;
    orderItemsListElement.appendChild(orderTotalRow);
}

// Đặt hàng
async function placeOrder() {
    const token = localStorage.getItem('accessToken');
    
    // Tạo payload cho API
    const orderPayload = {
        shipping_info: {
            full_name: orderData.shippingInfo.fullName,
            phone: orderData.shippingInfo.phoneNumber,
            email: orderData.shippingInfo.emailAddress,
            address: orderData.shippingInfo.address,
            city: orderData.shippingInfo.city,
            district: orderData.shippingInfo.district,
            zip_code: orderData.shippingInfo.zipCode,
            notes: orderData.shippingInfo.notes
        },
        payment_method: orderData.paymentMethod,
    };
    
    try {
        // Hiển thị nút đang xử lý
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Gọi API đặt hàng
        const response = await fetch('/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderPayload)
        });
        
        if (!response.ok) {
            throw new Error('Failed to place order');
        }
        
        // Lấy thông tin đơn hàng vừa tạo
        const order = await response.json();
        
        // Hiển thị modal xác nhận đơn hàng
        document.getElementById('orderConfirmationId').textContent = order.id;
        const orderConfirmationModal = new bootstrap.Modal(document.getElementById('orderConfirmationModal'));
        orderConfirmationModal.show();
        
        // Xóa giỏ hàng
        clearCart();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Failed to place order. Please try again.', 'danger');
        
        // Reset nút đặt hàng
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = '<i class="fas fa-check me-1"></i> Place Order';
    }
}

// Xóa giỏ hàng sau khi đặt hàng thành công
async function clearCart() {
    const token = localStorage.getItem('accessToken');
    
    try {
        await fetch('/cart', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Cập nhật số lượng sản phẩm trong giỏ hàng (header)
        updateCartCount();
        
    } catch (error) {
        console.error('Error clearing cart:', error);
        // Không xử lý lỗi ở đây vì đơn hàng đã được đặt thành công
    }
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