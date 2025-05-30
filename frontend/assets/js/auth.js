// assets/js/auth.js
import api from './api.js';

class Auth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        try {
            // Kiểm tra token và user data trong localStorage
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            if (token && userData) {
                const parsedUser = JSON.parse(userData);
                if (parsedUser && typeof parsedUser === 'object') {
                    this.currentUser = parsedUser;
                } else {
                    // Invalid user data, clear storage
                    this.clearSession();
                }
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
            this.clearSession();
        }
    }

    async login(email, password) {
        try {
            const response = await api.login(email, password);
            if (!response.access_token || !response.user) {
                throw new Error('Dữ liệu đăng nhập không hợp lệ');
            }
            this.setSession(response.access_token, response.user);
            return response.user;
        } catch (error) {
            console.error('Error logging in:', error);
            throw new Error(error.message || 'Đăng nhập thất bại');
        }
    }

    async register(userData) {
        try {
            const response = await api.register(userData);
            if (!response.access_token || !response.user) {
                throw new Error('Dữ liệu đăng ký không hợp lệ');
            }
            this.setSession(response.access_token, response.user);
            return response.user;
        } catch (error) {
            console.error('Error registering:', error);
            throw new Error(error.message || 'Đăng ký thất bại');
        }
    }

    logout() {
        this.clearSession();
        window.location.href = '../pages/login.html';
    }

    clearSession() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
    }

    setSession(token, user) {
        if (!token || !user) {
            throw new Error('Invalid session data');
        }
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUser = user;
    }

    isAuthenticated() {
        return !!this.currentUser && !!localStorage.getItem('token');
    }

    get user() {
        if (!this.currentUser) {
            return null;
        }
        return { ...this.currentUser }; // Return a copy to prevent direct modification
    }

    hasRole(role) {
        return this.currentUser?.role === role;
    }

    isAdmin() {
        return this.hasRole('admin');
    }

    isSeller() {
        return this.hasRole('seller');
    }

    isUser() {
        return this.hasRole('user');
    }

    async updateProfile(userData) {
        try {
            const updatedUser = await api.updateUserProfile(userData);
            this.currentUser = updatedUser;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw new Error('Không thể cập nhật thông tin cá nhân');
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            await api.changePassword(currentPassword, newPassword);
            return true;
        } catch (error) {
            console.error('Error changing password:', error);
            throw new Error('Không thể đổi mật khẩu');
        }
    }

    async forgotPassword(email) {
        try {
            await api.forgotPassword(email);
            return true;
        } catch (error) {
            console.error('Error requesting password reset:', error);
            throw new Error('Không thể gửi yêu cầu đặt lại mật khẩu');
        }
    }

    async resetPassword(token, newPassword) {
        try {
            await api.resetPassword(token, newPassword);
            return true;
        } catch (error) {
            console.error('Error resetting password:', error);
            throw new Error('Không thể đặt lại mật khẩu');
        }
    }
}

const auth = new Auth();
window.auth = auth; // Make auth globally available
export default auth;