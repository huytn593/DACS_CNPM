// Xử lý form đăng nhập
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Ẩn thông báo lỗi (nếu có)
    const alertElement = document.getElementById('loginAlert');
    alertElement.classList.add('d-none');
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Invalid email or password');
        }
        
        const data = await response.json();
        
        // Lưu token vào localStorage
        localStorage.setItem('accessToken', data.access_token);
        
        // Chuyển hướng dựa vào vai trò của người dùng
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        const role = payload.role;
        
        if (role === 'admin') {
            window.location.href = '/admin_dashboard.html';
        } else if (role === 'seller') {
            window.location.href = '/seller_dashboard.html';
        } else {
            // Điều hướng về trang trước đó hoặc trang chủ
            const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
            window.location.href = returnUrl || '/';
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Hiển thị thông báo lỗi
        alertElement.textContent = error.message;
        alertElement.classList.remove('d-none');
    }
});