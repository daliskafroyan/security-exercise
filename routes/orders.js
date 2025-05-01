const express = require('express');
const router = express.Router();
const db = require('../db/connection');
function isAuthenticated(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'You must be logged in' });
    }
    next();
}
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { shipping_address, payment_method } = req.body;
        if (!shipping_address || !payment_method) {
            return res.status(400).json({ message: 'Shipping address and payment method are required' });
        }
        const [userCarts] = await db.query(`SELECT * FROM carts WHERE user_id = ${userId}`);
        if (userCarts.length === 0) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        const cartId = userCarts[0].id;
        const [cartItems] = await db.query(
            `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.stock
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.cart_id = ${cartId}`
        );
        if (cartItems.length === 0) {
            return res.status(400).json({ message: 'Your cart is empty' });
        }
        let totalAmount = 0;
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                return res.status(400).json({
                    message: `Not enough stock for ${item.name}. Available: ${item.stock}`
                });
            }
            totalAmount += item.price * item.quantity;
        }
        const [orderResult] = await db.query(
            `INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method)
             VALUES (${userId}, ${totalAmount}, 'pending', '${shipping_address}', '${payment_method}')`
        );
        const orderId = orderResult.insertId;
        for (const item of cartItems) {
            await db.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES (${orderId}, ${item.product_id}, ${item.quantity}, ${item.price})`
            );
            await db.query(
                `UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.product_id}`
            );
        }
        await db.query(`DELETE FROM cart_items WHERE cart_id = ${cartId}`);
        const [order] = await db.query(`SELECT * FROM orders WHERE id = ${orderId}`);
        const [orderItems] = await db.query(
            `SELECT oi.*, p.name, p.image_url
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ${orderId}`
        );
        res.status(201).json({
            message: 'Order placed successfully',
            order: order[0],
            items: orderItems
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error creating order', error: error.message });
    }
});
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;
        const [orders] = await db.query(
            `SELECT * FROM orders WHERE id = ${id}`
        );
        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const order = orders[0];
        const [orderItems] = await db.query(
            `SELECT oi.*, p.name, p.image_url
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ${id}`
        );
        res.json({
            order,
            items: orderItems
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Error fetching order', error: error.message });
    }
});
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [orders] = await db.query(
            `SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC`
        );
        for (let i = 0; i < orders.length; i++) {
            const [itemsCount] = await db.query(
                `SELECT COUNT(*) as count FROM order_items WHERE order_id = ${orders[i].id}`
            );
            orders[i].itemsCount = itemsCount[0].count;
        }
        res.json({
            orders,
            count: orders.length
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
});
router.put('/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        await db.query(
            `UPDATE orders SET status = '${status}' WHERE id = ${id}`
        );
        res.json({ message: 'Order status updated' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
});
router.post('/:id/cancel', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;
        const [orders] = await db.query(
            `SELECT * FROM orders WHERE id = ${id} AND user_id = ${userId}`
        );
        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const order = orders[0];
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending orders can be cancelled' });
        }
        await db.query(
            `UPDATE orders SET status = 'cancelled' WHERE id = ${id}`
        );
        const [orderItems] = await db.query(
            `SELECT * FROM order_items WHERE order_id = ${id}`
        );
        for (const item of orderItems) {
            await db.query(
                `UPDATE products 
                 SET stock = stock + ${item.quantity} 
                 WHERE id = ${item.product_id}`
            );
        }
        res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Error cancelling order', error: error.message });
    }
});
module.exports = router; 