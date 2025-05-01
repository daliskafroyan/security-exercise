const express = require('express');
const router = express.Router();
const db = require('../db/connection');
async function getOrCreateCart(userId) {
    const [existingCarts] = await db.query(
        `SELECT * FROM carts WHERE user_id = ${userId}`
    );
    if (existingCarts.length > 0) {
        return existingCarts[0];
    }
    const [result] = await db.query(
        `INSERT INTO carts (user_id) VALUES (${userId})`
    );
    const [newCarts] = await db.query(
        `SELECT * FROM carts WHERE id = ${result.insertId}`
    );
    return newCarts[0];
}
function isAuthenticated(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'You must be logged in' });
    }
    next();
}
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const cart = await getOrCreateCart(userId);
        const [cartItems] = await db.query(
            `SELECT ci.id, ci.quantity, p.* 
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.cart_id = ${cart.id}`
        );
        let subtotal = 0;
        cartItems.forEach(item => {
            item.total = item.quantity * item.price;
            subtotal += item.total;
        });
        res.json({
            id: cart.id,
            items: cartItems,
            itemCount: cartItems.length,
            subtotal: subtotal
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Error fetching cart', error: error.message });
    }
});
router.post('/items', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, quantity = 1 } = req.body;
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }
        const [products] = await db.query(`SELECT * FROM products WHERE id = ${productId}`);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const product = products[0];
        if (product.stock < quantity) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }
        const cart = await getOrCreateCart(userId);
        const [existingItems] = await db.query(
            `SELECT * FROM cart_items WHERE cart_id = ${cart.id} AND product_id = ${productId}`
        );
        if (existingItems.length > 0) {
            const newQuantity = existingItems[0].quantity + parseInt(quantity);
            await db.query(
                `UPDATE cart_items 
                 SET quantity = ${newQuantity} 
                 WHERE id = ${existingItems[0].id}`
            );
            res.json({ message: 'Cart updated', itemId: existingItems[0].id });
        } else {
            const [result] = await db.query(
                `INSERT INTO cart_items (cart_id, product_id, quantity) 
                 VALUES (${cart.id}, ${productId}, ${quantity})`
            );
            res.status(201).json({ message: 'Item added to cart', itemId: result.insertId });
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Error adding to cart', error: error.message });
    }
});
router.put('/items/:itemId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { itemId } = req.params;
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }
        const [userCarts] = await db.query(`SELECT * FROM carts WHERE user_id = ${userId}`);
        if (userCarts.length === 0) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        const cartId = userCarts[0].id;
        const [cartItems] = await db.query(
            `SELECT ci.*, p.stock FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.id = ${itemId} AND ci.cart_id = ${cartId}`
        );
        if (cartItems.length === 0) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
        if (cartItems[0].stock < quantity) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }
        await db.query(
            `UPDATE cart_items SET quantity = ${quantity} WHERE id = ${itemId}`
        );
        res.json({ message: 'Cart item updated' });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ message: 'Error updating cart item', error: error.message });
    }
});
router.delete('/items/:itemId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { itemId } = req.params;
        const [userCarts] = await db.query(`SELECT * FROM carts WHERE user_id = ${userId}`);
        if (userCarts.length === 0) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        const cartId = userCarts[0].id;
        const [cartItems] = await db.query(
            `SELECT * FROM cart_items WHERE id = ${itemId} AND cart_id = ${cartId}`
        );
        if (cartItems.length === 0) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
        await db.query(`DELETE FROM cart_items WHERE id = ${itemId}`);
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ message: 'Error removing cart item', error: error.message });
    }
});
router.delete('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [userCarts] = await db.query(`SELECT * FROM carts WHERE user_id = ${userId}`);
        if (userCarts.length === 0) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        const cartId = userCarts[0].id;
        await db.query(`DELETE FROM cart_items WHERE cart_id = ${cartId}`);
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Error clearing cart', error: error.message });
    }
});
module.exports = router; 