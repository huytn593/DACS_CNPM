// /frontend/assets/js/cart.js
import api from './api.js';

// SCHEMA TYPEDEFS (JSDoc)
/**
 * @typedef {Object} CartItem
 * @property {string} id
 * @property {string} product_id
 * @property {string} product_name
 * @property {string|null} product_image
 * @property {number} price
 * @property {number} quantity
 * @property {Object|null} attributes
 * @property {boolean} [in_stock=true]
 * @property {string} added_at
 */
/**
 * @typedef {Object} CartResponse
 * @property {CartItem[]} [items=[]]
 * @property {number} [total=0]
 * @property {number} [items_count=0]
 */
/**
 * @typedef {Object} CartItemCreate
 * @property {string} product_id
 * @property {number} quantity
 * @property {Object|null} attributes
 */
/**
 * @typedef {Object} CartItemUpdate
 * @property {number|null} quantity
 * @property {Object|null} attributes
 */

class CartService {
    constructor() {
        this.items = [];
        this.total = 0;
        this.itemsCount = 0;
    }

    async getCart() {
        const cart = await api.getCart();
        this.items = cart.items || [];
        this.total = cart.total || 0;
        this.itemsCount = cart.items_count || 0;
        return cart;
    }
}

const cartService = new CartService();
export { cartService };
export default cartService;