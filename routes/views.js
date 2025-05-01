const express = require('express');
const router = express.Router();
const db = require('../db/connection');
router.get('/', async (req, res) => {
    try {
        const featuredProducts = await db.query(
            'SELECT * FROM products LIMIT 6'
        );
        res.render('index', {
            title: 'Home',
            featuredProducts: featuredProducts.rows
        });
    } catch (error) {
        console.error('Error fetching featured products:', error);
        res.render('index', {
            title: 'Home',
            featuredProducts: []
        });
    }
});
router.get('/products', async (req, res) => {
    try {
        const {
            category,
            search,
            minPrice,
            maxPrice,
            sort = 'name_asc',
            page = 1
        } = req.query;
        const limit = 9;
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        if (search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        if (minPrice) {
            query += ' AND price >= ?';
            params.push(minPrice);
        }
        if (maxPrice) {
            query += ' AND price <= ?';
            params.push(maxPrice);
        }
        switch (sort) {
            case 'price_asc':
                query += ' ORDER BY price ASC';
                break;
            case 'price_desc':
                query += ' ORDER BY price DESC';
                break;
            case 'name_desc':
                query += ' ORDER BY name DESC';
                break;
            default:
                query += ' ORDER BY name ASC';
        }
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const [products] = await db.query(query, params);
        let countQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
        const countParams = [];
        if (search) {
            countQuery += ' AND (name LIKE ? OR description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }
        if (minPrice) {
            countQuery += ' AND price >= ?';
            countParams.push(minPrice);
        }
        if (maxPrice) {
            countQuery += ' AND price <= ?';
            countParams.push(maxPrice);
        }
        const [totalCount] = await db.query(countQuery, countParams);
        const totalPages = Math.ceil(totalCount[0].count / limit);
        const [categories] = await db.query('SELECT DISTINCT category FROM products ORDER BY category');
        res.render('products', {
            title: 'Products',
            products: products,
            categories: categories.map(c => c.category),
            selectedCategory: category,
            search,
            minPrice,
            maxPrice,
            sort,
            currentPage: parseInt(page),
            totalPages,
            totalCount: totalCount[0].count
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.render('products', {
            title: 'Products',
            products: [],
            categories: [],
            selectedCategory: '',
            search: '',
            minPrice: '',
            maxPrice: '',
            sort: 'name_asc',
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            error: `Failed to load products: ${error.message}`
        });
    }
});
router.get('/products/:id', async (req, res) => {
    try {
        const [products] = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [req.params.id]
        );
        if (products.length === 0) {
            return res.status(404).render('error', {
                title: 'Product Not Found',
                message: 'The requested product could not be found.'
            });
        }
        res.render('product-detail', {
            title: products[0].name,
            product: products[0]
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load product details.'
        });
    }
});
router.get('/cart', async (req, res) => {
    try {
        res.render('cart', {
            title: 'Shopping Cart'
        });
    } catch (error) {
        console.error('Error rendering cart page:', error);
        res.render('error', {
            title: 'Error',
            message: 'Failed to load cart page'
        });
    }
});
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/products');
    }
    res.render('login', {
        title: 'Login'
    });
});
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/products');
    }
    res.render('register', {
        title: 'Register'
    });
});
router.get('/test-sql-injection', async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.json({ message: 'Please provide a search parameter' });
        }
        let query = `SELECT * FROM products WHERE 1=1`;
        if (search) {
            query += ` AND (name LIKE '${search}' OR description LIKE '${search}')`;
        }
        console.log("Test SQL Query:", query);
        const [products] = await db.query(query);
        res.json({
            query: query,
            results: products,
            count: products.length
        });
    } catch (error) {
        console.error('SQL Error:', error);
        res.status(500).json({
            message: 'Error executing query',
            error: error.message,
            query: req.query.search
        });
    }
});
router.get('/test-sql-html', async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.send('<h1>Please provide a search parameter</h1>');
        }
        const query = `SELECT * FROM products WHERE name LIKE '${search}'`;
        console.log("HTML Test SQL Query:", query);
        const [products] = await db.query(query);
        let html = `
            <h1>SQL Injection Test</h1>
            <p><strong>Query:</strong> ${query}</p>
            <p><strong>Results:</strong> ${products.length} items found</p>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Other Fields</th>
                </tr>
        `;
        products.forEach(product => {
            html += `
                <tr>
                    <td>${product.id || 'null'}</td>
                    <td>${product.name || 'null'}</td>
                    <td>${product.description || 'null'}</td>
                    <td>${product.price || 'null'}</td>
                    <td>${product.category || 'null'}</td>
                    <td>${JSON.stringify(product)}</td>
                </tr>
            `;
        });
        html += `</table>`;
        res.send(html);
    } catch (error) {
        console.error('SQL Error:', error);
        res.status(500).send(`
            <h1>Error</h1>
            <p>Error executing query: ${error.message}</p>
            <p>Search term: ${req.query.search}</p>
        `);
    }
});
router.get('/sqli-test', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.send(`
                <h1>SQL Injection Test</h1>
                <p>Use this endpoint to test SQL injection with direct query input.</p>
                <p>Example: <a href="/sqli-test?query=SELECT * FROM products">/sqli-test?query=SELECT * FROM products</a></p>
                <p>Example: <a href="/sqli-test?query=SELECT id, username, email, password FROM users">/sqli-test?query=SELECT id, username, email, password FROM users</a></p>
                <p>Example: <a href="/sqli-test?query=SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()">/sqli-test?query=SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()</a></p>
            `);
        }
        console.log("Executing direct SQL query:", query);
        const [results] = await db.query(query);
        let html = `
            <h1>SQL Injection Test</h1>
            <p><strong>Query:</strong> ${query}</p>
            <p><strong>Results:</strong> ${results.length} items found</p>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <tr>
        `;
        if (results.length > 0) {
            const keys = Object.keys(results[0]);
            keys.forEach(key => {
                html += `<th>${key}</th>`;
            });
            html += '</tr>';
            results.forEach(row => {
                html += '<tr>';
                keys.forEach(key => {
                    html += `<td>${row[key] !== null ? row[key] : 'null'}</td>`;
                });
                html += '</tr>';
            });
        } else {
            html += '<th>No results</th></tr><tr><td>No data found</td></tr>';
        }
        html += `</table>
            <p><a href="/sqli-test">Back to examples</a></p>
        `;
        res.send(html);
    } catch (error) {
        console.error('SQL Error:', error);
        res.status(500).send(`
            <h1>Error</h1>
            <p>Error executing query: ${error.message}</p>
            <p>Query: ${req.query.query}</p>
            <p><a href="/sqli-test">Back to examples</a></p>
        `);
    }
});
module.exports = router; 