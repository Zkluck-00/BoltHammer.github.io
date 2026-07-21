const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/categories', require('./category.routes'));
router.use('/suppliers', require('./supplier.routes'));
router.use('/products', require('./product.routes'));
router.use('/clients', require('./client.routes'));
router.use('/sales', require('./sale.routes'));
router.use('/movements', require('./movement.routes'));
router.use('/reports', require('./report.routes'));
router.use('/users', require('./user.routes'));

module.exports = router;
