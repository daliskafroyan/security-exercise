const express = require('express');
const router = express.Router();
const db = require('../db/connection');
router.get('/', async (req, res) => {
    try {
        const { category, search, min_price, max_price, sort } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        if (category) {
            query += ` AND category = '${category}'`;
        }
        if (search) {
            query += ` AND (name LIKE '%${search}%' OR description LIKE '%${search}%')`;
        }
        if (min_price) {
            query += ` AND price >= ${min_price}`;
        }
        if (max_price) {
            query += ` AND price <= ${max_price}`;
        }
        if (sort) {
            const [field, direction] = sort.split(':');
            if (field && direction) {
                query += ` ORDER BY ${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
            }
        } else {
            query += ' ORDER BY id ASC';
        }
        const [products] = await db.query(query);
        res.json({ products, count: products.length });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
});
router.get('/search', async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return res.status(400).json({ message: 'Search keyword is required' });
        }
        const query = `SELECT * FROM products WHERE name LIKE '%${keyword}%' OR description LIKE '%${keyword}%'`;
        console.log('Executing query:', query); 
        const [products] = await db.query(query);
        res.json({
            products,
            query: query 
        });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({
            message: 'Error searching products',
            error: error.message,
            query: req.query.keyword 
        });
    }
});
router.get('/sqli-test', async (req, res) => {
    try {
        const { query: sqlQuery } = req.query;
        if (!sqlQuery) {
            return res.status(400).json({
                message: 'SQL query is required',
                examples: [
                    {
                        description: 'Show all products',
                        query: 'SELECT * FROM products'
                    },
                    {
                        description: 'Show all users with password hashes',
                        query: 'SELECT * FROM users'
                    },
                    {
                        description: 'Show database tables',
                        query: 'SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()'
                    }
                ]
            });
        }
        console.log('Executing direct SQL query:', sqlQuery);
        try {
            const [results] = await db.query(sqlQuery);
            res.json({
                results,
                count: results.length,
                query: sqlQuery
            });
        } catch (sqlError) {
            res.status(400).json({
                error: sqlError.message,
                query: sqlQuery
            });
        }
    } catch (error) {
        console.error('Error in SQL injection test endpoint:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [products] = await db.query(`SELECT * FROM products WHERE id = ${id}`);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ product: products[0] });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Error fetching product', error: error.message });
    }
});
router.post('/', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const { name, description, price, image_url, category, stock } = req.body;
        const result = await db.query(
            `INSERT INTO products (name, description, price, image_url, category, stock) 
             VALUES ('${name}', '${description}', ${price}, '${image_url}', '${category}', ${stock})`
        );
        res.status(201).json({
            message: 'Product created successfully',
            productId: result[0].insertId
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error creating product', error: error.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const { name, description, price, image_url, category, stock } = req.body;
        await db.query(
            `UPDATE products 
             SET name = '${name}', description = '${description}', price = ${price}, 
             image_url = '${image_url}', category = '${category}', stock = ${stock} 
             WHERE id = ${id}`
        );
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error updating product', error: error.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        await db.query(`DELETE FROM products WHERE id = ${id}`);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
});
module.exports = router; 