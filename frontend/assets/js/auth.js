// frontend/assets/js/auth.js
import api from './api.js';
import { config } from '/config.js';

class AuthService {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.tokenKey = 'auth_token';

        // Kiểm tra đăng nhập khi khởi tạo
        this.checkAuth();
    }

    async checkAuth() {
        const token = localStorage.getItem(this.tokenKey);
        if (token) {
            try {
                // Lấy thông tin người dùng hiện tại
                const user = await api.getCurrentUser();
                this.isAuthenticated = true;
                this.user = user;
                return true;
            } catch (error) {
                console.error('Token không hợp lệ hoặc hết hạn:', error);
                this.logout(false); // Không chuyển hướng khi kiểm tra ban đầu
                return false;
            }
        }
        return false;
    }

    async login(username, password) {
        try {
            console.log('Attempting login with:', username);
            const data = await api.login(username, password);
            localStorage.setItem(this.tokenKey, data.access_token);
            this.isAuthenticated = true;

            // Lấy thông tin người dùng sau khi đăng nhập
            if (data.user) {
                this.user = data.user;
            } else {
                const user = await api.getCurrentUser();
                this.user = user;
            }

            return this.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout(redirect = true) {
        localStorage.removeItem(this.tokenKey);
        this.isAuthenticated = false;
        this.user = null;

        // Chuyển hướng về trang đăng nhập nếu cần
        if (redirect) {
            window.location.href = '/pages/login.html';
        }
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    getUser() {
        return this.user;
    }

    hasRole(role) {
        return this.user && this.user.role === role;
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }
}

// Khởi tạo và export
export default new AuthService();