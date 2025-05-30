// /frontend/assets/js/order.js
import api from './api.js';

// SCHEMA TYPEDEFS (JSDoc)
/**
 * @typedef {Object} OrderCreate
 * @property {string} shipping_address
 * @property {string} phone_number
 * @property {Array<OrderItemBase>} items
 * @property {string|null} [payment_method="COD"]
 */
/**
 * @typedef {Object} OrderItemBase
 * @property {string} product_id
 * @property {number} quantity
 * @property {number} price
 * @property {Object|null} attributes
 */
/**
 * @typedef {Object} OrderResponse
 * @property {string} id
 * @property {string} order_number
 * @property {string} user_id
 * @property {string} user_name
 * @property {number} total_amount
 * @property {Array<OrderItem>} items
 * @property {string} shipping_address
 * @property {string|null} billing_address
 * @property {string} status
 * @property {string} payment_method
 * @property {string} payment_status
 * @property {string|null} notes
 * @property {string} phone_number
 * @property {number} shipping_fee
 * @property {string} created_at
 * @property {string} updated_at
 */
/**
 * @typedef {Object} OrderItem
 * @property {string} product_id
 * @property {number} quantity
 * @property {number} price
 * @property {Object|null} attributes
 * @property {string} id
 * @property {string|null} product_name
 * @property {string|null} product_image
 */

class OrderService {
    constructor() {
        this.orders = [];
    }

    async createOrder(data) {
        return api.createOrder(data);
    }

    async getOrders(page = 1, limit = 10) {
        try {
            const response = await api.getUserOrders();
            this.orders = response.items || [];
            return response;
        } catch (error) {
            throw new Error('Không thể tải danh sách đơn hàng');
        }
    }

    async getOrderDetail(orderId) {
        try {
            return await api.getOrderById(orderId);
        } catch (error) {
            throw new Error('Không thể tải thông tin đơn hàng');
        }
    }

    async cancelOrder(orderId) {
        try {
            return await api.cancelOrder(orderId);
        } catch (error) {
            throw new Error('Không thể hủy đơn hàng');
        }
    }

    async getOrderStatus(orderId) {
        try {
            const order = await this.getOrderDetail(orderId);
            return order.status;
        } catch (error) {
            throw new Error('Không thể tải trạng thái đơn hàng');
        }
    }

    // Alias methods for backward compatibility
    async getOrderStatusById(orderId) {
        return this.getOrderStatus(orderId);
    }
}

const orderService = new OrderService();
export { orderService };
export default orderService;