// /frontend/assets/js/cart.js
import { api } from './api.js';

export const cartService = {
    // Get current cart
    async getCart() {
        try {
            return await api.getCart();
        } catch (error) {
            console.error('Error fetching cart:', error);
            throw error;
        }
    },

    // Add item to cart
    async addItem(productId, quantity = 1, attributes = null) {
        try {
            return await api.addToCart(productId, quantity, attributes);
        } catch (error) {
            console.error('Error adding item to cart:', error);
            throw error;
        }
    },

    // Update cart item
    async updateItem(itemId, quantity, attributes = null) {
        try {
            return await api.updateCartItem(itemId, quantity, attributes);
        } catch (error) {
            console.error('Error updating cart item:', error);
            throw error;
        }
    },

    // Remove item from cart
    async removeItem(itemId) {
        try {
            return await api.removeCartItem(itemId);
        } catch (error) {
            console.error('Error removing item from cart:', error);
            throw error;
        }
    },

    // Check if a product is in the cart
    async isInCart(productId) {
        try {
            const cart = await this.getCart();
            return cart.items.some(item => item.product_id === productId);
        } catch (error) {
            console.error('Error checking if product is in cart:', error);
            return false;
        }
    },

    // Get cart item count
    async getItemCount() {
        try {
            const cart = await this.getCart();
            return cart.items_count || 0;
        } catch (error) {
            console.error('Error getting cart item count:', error);
            return 0;
        }
    },

    // Get cart total
    async getTotal() {
        try {
            const cart = await this.getCart();
            return cart.total || 0;
        } catch (error) {
            console.error('Error getting cart total:', error);
            return 0;
        }
    },

    // Clear cart
    async clearCart() {
        try {
            const cart = await this.getCart();
            for (const item of cart.items) {
                await this.removeItem(item.id);
            }
            return true;
        } catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    }
};