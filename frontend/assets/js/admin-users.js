import api from './api.js';

// Render danh sách người dùng
async function renderUsers() {
    try {
        const users = await api.getAllUsers();
        const tbody = document.getElementById('users-table');
        tbody.innerHTML = (users.items || users).map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username || ''}</td>
                <td>${user.email || ''}</td>
                <td>${user.role || ''}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Xóa</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Lỗi khi tải danh sách người dùng:', error);
    }
}

// Xóa người dùng
async function deleteUser(userId) {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
        try {
            await api.deleteUser(userId);
            alert('Xóa người dùng thành công!');
            await renderUsers();
        } catch (error) {
            console.error('Lỗi khi xóa người dùng:', error);
            alert('Không thể xóa người dùng.');
        }
    }
}

// Khởi tạo trang
(async function() {
    await renderUsers();
})(); 