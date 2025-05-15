// Xử lý form đăng ký
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Lấy dữ liệu từ form
    const fullName = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const phoneNumber = document.getElementById('phone_number').value;
    const shippingAddress = document.getElementById('shipping_address').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    // Ẩn thông báo lỗi (nếu có)
    const alertElement = document.getElementById('registerAlert');
    alertElement.classList.add('d-none');

    // Kiểm tra mật khẩu khớp nhau
    if (password !== confirmPassword) {
        alertElement.textContent = 'Passwords do not match';
        alertElement.classList.remove('d-none');
        return;
    }

    // Kiểm tra định dạng số điện thoại (10 chữ số, bắt đầu bằng 0)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
        alertElement.textContent = 'Phone number must be 10 digits and start with 0';
        alertElement.classList.remove('d-none');
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                password: password,
                phone_number: phoneNumber,
                shipping_address: shippingAddress,
                role: role
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed');
        }

        // Đăng ký thành công, chuyển hướng đến trang đăng nhập
        window.location.href = '/login.html?registered=true';

    } catch (error) {
        console.error('Registration error:', error);

        // Hiển thị thông báo lỗi
        alertElement.textContent = error.message;
        alertElement.classList.remove('d-none');
    }
});