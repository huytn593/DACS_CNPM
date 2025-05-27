// /frontend/assets/js/admin.js
import { api } from './api.js';

export const adminService = {
    // Get all users with pagination
    async getUsers(page = 1, size = 10) {
        try {
            return await api.getAllUsers(page, size);
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    // Get all orders with pagination
    async getOrders(page = 1, size = 10) {
        try {
            return await api.getAllOrders(page, size);
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    },

    // Get all reports with pagination
    async getReports(page = 1, size = 10) {
        try {
            return await api.getAllReports(page, size);
        } catch (error) {
            console.error('Error fetching reports:', error);
            throw error;
        }
    },

    // Update report status
    async updateReportStatus(reportId, status, adminNotes = null) {
        try {
            return await api.updateReportStatus(reportId, status, adminNotes);
        } catch (error) {
            console.error('Error updating report:', error);
            throw error;
        }
    },

    // Create a new category
    async createCategory(categoryData) {
        try {
            return await api.createCategory({
                name: categoryData.name,
                description: categoryData.description,
                parent_id: categoryData.parent_id,
                image: categoryData.image
            });
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    },

    // Update an existing category
    async updateCategory(categoryId, categoryData) {
        try {
            const updateData = {};

            // Only include fields that are provided
            if (categoryData.name !== undefined) updateData.name = categoryData.name;
            if (categoryData.description !== undefined) updateData.description = categoryData.description;
            if (categoryData.parent_id !== undefined) updateData.parent_id = categoryData.parent_id;
            if (categoryData.image !== undefined) updateData.image = categoryData.image;

            return await api.updateCategory(categoryId, updateData);
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    },

    // Get dashboard statistics
    async getDashboardStats() {
        try {
            const users = await this.getUsers(1, 100);
            const orders = await this.getOrders(1, 100);
            const reports = await this.getReports(1, 100);

            // Calculate statistics
            const totalUsers = users.total || 0;
            const totalOrders = orders.length || 0;
            const totalRevenue = orders
                .filter(order => order.status === 'delivered')
                .reduce((sum, order) => sum + order.total_amount, 0);
            const commissionRevenue = totalRevenue * 0.05; // 5% commission
            const pendingReports = reports.filter(report => report.status === 'pending').length;

            // Count users by role
            const usersByRole = {
                user: users.filter(user => user.role === 'user').length,
                seller: users.filter(user => user.role === 'seller').length,
                admin: users.filter(user => user.role === 'admin').length
            };

            // Count orders by status
            const ordersByStatus = {
                pending: orders.filter(order => order.status === 'pending').length,
                shipped: orders.filter(order => order.status === 'shipped').length,
                delivered: orders.filter(order => order.status === 'delivered').length,
                canceled: orders.filter(order => order.status === 'canceled').length
            };

            return {
                totalUsers,
                totalOrders,
                totalRevenue,
                commissionRevenue,
                pendingReports,
                usersByRole,
                ordersByStatus
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }
};