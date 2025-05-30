import api from './api.js';

// Tab switching logic
const tabs = document.querySelectorAll('.tab-item');
const panes = document.querySelectorAll('.tab-pane');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-container').classList.add('active');
    });
});

// Load admin profile
async function loadAdminProfile() {
    const container = document.getElementById('profile-container');
    try {
        const user = await api.getUserProfile();
        container.innerHTML = `<form id="admin-profile-form">
            <label>Họ tên:<input name="name" value="${user.name || ''}" required></label>
            <label>Email:<input name="email" value="${user.email || ''}" required></label>
            <button type="submit">Cập nhật</button>
        </form><div id="profile-msg"></div>`;
        document.getElementById('admin-profile-form').onsubmit = async e => {
            e.preventDefault();
            const form = e.target;
            try {
                await api.updateProfile({
                    name: form.name.value,
                    email: form.email.value
                });
                document.getElementById('profile-msg').textContent = 'Cập nhật thành công!';
            } catch (err) {
                document.getElementById('profile-msg').textContent = 'Lỗi: ' + err.message;
            }
        };
    } catch (err) {
        container.innerHTML = 'Không thể tải thông tin quản trị viên.';
    }
}

// Change password (stub)
function loadPasswordForm() {
    const container = document.getElementById('password-container');
    container.innerHTML = `<form id="admin-password-form">
        <label>Mật khẩu cũ:<input type="password" name="old_password" required></label>
        <label>Mật khẩu mới:<input type="password" name="new_password" required></label>
        <button type="submit">Đổi mật khẩu</button>
    </form><div id="password-msg"></div>`;
    document.getElementById('admin-password-form').onsubmit = async e => {
        e.preventDefault();
        // TODO: Implement password change API
        document.getElementById('password-msg').textContent = 'Chức năng này sẽ sớm có.';
    };
}

// Platform settings (stub)
function loadPlatformSettings() {
    const container = document.getElementById('platform-container');
    container.innerHTML = `<div>Chức năng cài đặt hệ thống sẽ sớm có.</div>`;
}

// Initial load
loadAdminProfile();
loadPasswordForm();
loadPlatformSettings(); 