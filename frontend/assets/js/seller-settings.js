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

// Load seller profile
async function loadSellerProfile() {
    const container = document.getElementById('profile-container');
    try {
        const user = await api.getUserProfile();
        container.innerHTML = `<form id="seller-profile-form">
            <label>Họ tên:<input name="name" value="${user.name || ''}" required></label>
            <label>Email:<input name="email" value="${user.email || ''}" required></label>
            <label>Ảnh đại diện:
                <input type="file" name="avatar" accept="image/*">
                ${user.avatar ? `<img src="/uploads/products/${user.avatar}" alt="Avatar" style="max-width: 100px;">` : ''}
            </label>
            <button type="submit">Cập nhật</button>
        </form><div id="profile-msg"></div>`;
        document.getElementById('seller-profile-form').onsubmit = async e => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData();
            formData.append('name', form.name.value);
            formData.append('email', form.email.value);
            if (form.avatar.files[0]) {
                formData.append('avatar', form.avatar.files[0]);
            }
            try {
                await api.updateProfile(formData);
                document.getElementById('profile-msg').textContent = 'Cập nhật thành công!';
                await loadSellerProfile(); // Reload to show new avatar
            } catch (err) {
                document.getElementById('profile-msg').textContent = 'Lỗi: ' + err.message;
            }
        };
    } catch (err) {
        container.innerHTML = 'Không thể tải thông tin người bán.';
    }
}

// Change password (stub)
function loadPasswordForm() {
    const container = document.getElementById('password-container');
    container.innerHTML = `<form id="seller-password-form">
        <label>Mật khẩu cũ:<input type="password" name="old_password" required></label>
        <label>Mật khẩu mới:<input type="password" name="new_password" required></label>
        <button type="submit">Đổi mật khẩu</button>
    </form><div id="password-msg"></div>`;
    document.getElementById('seller-password-form').onsubmit = async e => {
        e.preventDefault();
        // TODO: Implement password change API
        document.getElementById('password-msg').textContent = 'Chức năng này sẽ sớm có.';
    };
}

// Shop settings
function loadShopSettings() {
    const container = document.getElementById('shop-container');
    container.innerHTML = `<form id="shop-settings-form">
        <label>Tên cửa hàng:<input name="shop_name" required></label>
        <label>Mô tả cửa hàng:<textarea name="shop_description"></textarea></label>
        <label>Logo cửa hàng:
            <input type="file" name="shop_logo" accept="image/*">
            <div id="shop-logo-preview"></div>
        </label>
        <label>Banner cửa hàng:
            <input type="file" name="shop_banner" accept="image/*">
            <div id="shop-banner-preview"></div>
        </label>
        <button type="submit">Lưu cài đặt</button>
    </form><div id="shop-msg"></div>`;

    // Preview images before upload
    document.querySelector('input[name="shop_logo"]').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('shop-logo-preview').innerHTML = 
                    `<img src="${e.target.result}" alt="Logo preview" style="max-width: 200px;">`;
            }
            reader.readAsDataURL(file);
        }
    });

    document.querySelector('input[name="shop_banner"]').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('shop-banner-preview').innerHTML = 
                    `<img src="${e.target.result}" alt="Banner preview" style="max-width: 100%;">`;
            }
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('shop-settings-form').onsubmit = async e => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData();
        formData.append('shop_name', form.shop_name.value);
        formData.append('shop_description', form.shop_description.value);
        if (form.shop_logo.files[0]) {
            formData.append('shop_logo', form.shop_logo.files[0]);
        }
        if (form.shop_banner.files[0]) {
            formData.append('shop_banner', form.shop_banner.files[0]);
        }
        try {
            // TODO: Implement shop settings API
            document.getElementById('shop-msg').textContent = 'Cài đặt cửa hàng sẽ sớm có.';
        } catch (err) {
            document.getElementById('shop-msg').textContent = 'Lỗi: ' + err.message;
        }
    };
}

// Initial load
loadSellerProfile();
loadPasswordForm();
loadShopSettings(); 