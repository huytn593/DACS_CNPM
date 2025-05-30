// adminService.js

export function checkAuth() {
  // Kiểm tra quyền admin, nếu không phải thì chuyển hướng
  const user = getUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '/pages/login.html';
  }
}

export function getUser() {
  // Trả về thông tin user hiện tại (có thể lấy từ localStorage)
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export async function createCategory(data) {
  // Gửi request tạo category mới (ví dụ dùng fetch)
  return fetch('/api/v1/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export async function updateCategory(id, data) {
  // Gửi request cập nhật category
  return fetch(`/api/v1/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

export async function deleteCategory(id) {
  // Gửi request xóa category
  return fetch(`/api/v1/categories/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
  }).then(res => res.json());
}

export async function getCategories() {
  // Lấy danh sách danh mục
  return fetch('/api/v1/categories', {
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
  }).then(res => res.json());
} 