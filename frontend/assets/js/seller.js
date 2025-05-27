// /frontend/assets/js/seller.js
import { api } from './api.js';

export const sellerService = {
    // Get seller products with pagination
    async getProducts(page = 1, size = 10) {
        try {
            return await api.getSellerProducts(page, size);
        } catch (error) {
            console.error('Error fetching seller products:', error);
            throw error;
        }
    },

    // Create a new product
    async createProduct(productData) {
        try {
            return await api.createSellerProduct({
                name: productData.name,
                description: productData.description,
                price: parseFloat(productData.price),
                stock: parseInt(productData.stock, 10),
                category_id: productData.category_id,
                sku: productData.sku,
                active: productData.active !== undefined ? productData.active : true,
                images: productData.images || []
            });
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    },

    // Update an existing product
    async updateProduct(productId, productData) {
        try {
            const updateData = {};

            // Only include fields that are provided
            if (productData.name !== undefined) updateData.name = productData.name;
            if (productData.description !== undefined) updateData.description = productData.description;
            if (productData.price !== undefined) updateData.price = parseFloat(productData.price);
            if (productData.stock !== undefined) updateData.stock = parseInt(productData.stock, 10);
            if (productData.category_id !== undefined) updateData.category_id = productData.category_id;
            if (productData.sku !== undefined) updateData.sku = productData.sku;
            if (productData.active !== undefined) updateData.active = productData.active;
            if (productData.images !== undefined) updateData.images = productData.images;

            return await api.updateSellerProduct(productId, updateData);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    // Get seller orders with pagination
    async getOrders(page = 1, size = 10) {
        try {
            return await api.getSellerOrders(page, size);
        } catch (error) {
            console.error('Error fetching seller orders:', error);
            throw error;
        }
    },

    // Get dashboard statistics
    async getDashboardStats() {
        try {
            const products = await this.getProducts(1, 100);
            const orders = await this.getOrders(1, 100);

            // Calculate statistics
            const totalProducts = products.total || 0;
            const totalOrders = orders.length || 0;
            const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
            const lowStockProducts = products.products.filter(p => p.stock < 10).length;

            return {
                totalProducts,
                totalOrders,
                totalRevenue,
                lowStockProducts
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }
};