// /frontend/assets/js/user.js
import { api } from './api.js';

export const userService = {
    // Current user info
    currentUser: null,

    // Initialize user service
    init() {
        this.loadUserFromStorage();
    },

    // Save user to localStorage
    setCurrentUser(userData) {
        this.currentUser = userData;
        localStorage.setItem('user', JSON.stringify(userData));
    },

    // Load user from localStorage
    loadUserFromStorage() {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored user data', e);
                localStorage.removeItem('user');
            }
        }
    },

    // Login user
    async login(username, password) {
        try {
            const response = await api.login(username, password);
            if (response.access_token) {
                localStorage.setItem('token', response.access_token);
                this.setCurrentUser(response.user);
                return response.user;
            }
            throw new Error('Không nhận được token');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // Register user
    async register(userData) {
        try {
            return await api.register(userData);
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },

    // Logout
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        window.location.href = 'login.html';
    },

    // Get user profile
    async getProfile() {
        try {
            const userData = await api.getUserProfile();
            this.setCurrentUser(userData);
            return userData;
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    },

    // Update user profile
    async updateProfile(userData) {
        try {
            const updatedUser = await api.updateUserProfile(userData);
            this.setCurrentUser(updatedUser);
            return updatedUser;
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!localStorage.getItem('token');
    },

    // Check if user has a specific role
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    },

    // Get user's full name
    getFullName() {
        return this.currentUser ? this.currentUser.full_name : 'Guest';
    }
};

// Initialize user service when imported
userService.init();