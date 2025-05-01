const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const expressLayouts = require('express-ejs-layouts');
const authRoutes = require('./routes/auth');
const db = require('./db/connection');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const viewRoutes = require('./routes/views');
const swaggerSpecs = require('./swagger');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'insecure-session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "E-commerce API Documentation",
    swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
    }
}));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/', viewRoutes);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Server Error',
        message: 'Something went wrong! Please try again later.'
    });
});
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
module.exports = app; 