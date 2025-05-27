// /frontend/assets/js/product.js
import { api } from './api.js';

export const productService = {
    // Get products with pagination and optional category filter
    async getProducts(page = 1, size = 10, categoryId = null) {
        try {
            return await api.getProducts(page, size, categoryId);
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },

    // Get a single product by ID
    async getProductById(productId) {
        try {
            return await api.getProductById(productId);
        } catch (error) {
            console.error('Error fetching product details:', error);
            throw error;
        }
    },

    // Get product reviews
    async getProductReviews(productId) {
        try {
            return await api.getProductReviews(productId);
        } catch (error) {
            console.error('Error fetching product reviews:', error);
            throw error;
        }
    },

    // Create a review for a product
    async createReview(productId, rating, comment = null) {
        try {
            return await api.createReview(productId, rating, comment);
        } catch (error) {
            console.error('Error creating review:', error);
            throw error;
        }
    },

    // Get categories
    async getCategories() {
        try {
            return await api.getCategories();
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    },

    // Add product to wishlist
    async addToWishlist(productId) {
        try {
            return await api.addToWishlist(productId);
        } catch (error) {
            console.error('Error adding product to wishlist:', error);
            throw error;
        }
    },

    // Remove product from wishlist
    async removeFromWishlist(productId) {
        try {
            return await api.removeFromWishlist(productId);
        } catch (error) {
            console.error('Error removing product from wishlist:', error);
            throw error;
        }
    },

    // Check if product is in wishlist
    async isInWishlist(productId) {
        try {
            const wishlist = await api.getWishlist();
            return wishlist.some(item => item.product_id === productId);
        } catch (error) {
            console.error('Error checking if product is in wishlist:', error);
            return false;
        }
    },

    // Report a product
    async reportProduct(productId, description) {
        try {
            return await api.reportProduct(productId, description);
        } catch (error) {
            console.error('Error reporting product:', error);
            throw error;
        }
    },

    // Compare products
    async compareProducts(productIds) {
        try {
            // Make sure we have between 2-4 product IDs as required by the schema
            if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4) {
                throw new Error('Product comparison requires 2-4 products');
            }

            // Fetch each product separately since there's no comparison API endpoint defined
            const products = await Promise.all(
                productIds.map(id => this.getProductById(id))
            );

            return {
                products,
                comparison_warning: null // This would typically come from a backend endpoint
            };
        } catch (error) {
            console.error('Error comparing products:', error);
            throw error;
        }
    }
};