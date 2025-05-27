// /frontend/assets/js/order.js
import { api } from './api.js';

export const orderService = {
    // Create a new order
    async createOrder(orderData) {
        try {
            return await api.createOrder({
                shipping_address: orderData.shipping_address,
                phone_number: orderData.phone_number,
                payment_method: orderData.payment_method || 'COD',
                items: orderData.items
            });
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    },

    // Get user orders with pagination
    async getUserOrders(page = 1, size = 10) {
        try {
            return await api.getUserOrders(page, size);
        } catch (error) {
            console.error('Error fetching user orders:', error);
            throw error;
        }
    },

    // Get order by ID
    async getOrderById(orderId) {
        try {
            return await api.getOrderById(orderId);
        } catch (error) {
            console.error('Error fetching order details:', error);
            throw error;
        }
    },

    // Update order status
    async updateOrderStatus(orderId, status) {
        try {
            return await api.updateOrderStatus(orderId, status);
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    },

    // Create order from cart
    async createOrderFromCart(shippingAddress, phoneNumber, paymentMethod = 'COD') {
        try {
            // First get the cart
            const cart = await api.getCart();

            // Transform cart items to order items
            const orderItems = cart.items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                attributes: item.attributes || null
            }));

            // Create the order
            const order = await this.createOrder({
                shipping_address: shippingAddress,
                phone_number: phoneNumber,
                payment_method: paymentMethod,
                items: orderItems
            });

            // Clear the cart
            await Promise.all(cart.items.map(item => api.removeCartItem(item.id)));

            return order;
        } catch (error) {
            console.error('Error creating order from cart:', error);
            throw error;
        }
    },

    // Calculate order summary
    calculateOrderSummary(items, shippingFee = 30000) {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal + shippingFee;

        return {
            subtotal,
            shippingFee,
            total,
            itemCount: items.length,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
        };
    }
};