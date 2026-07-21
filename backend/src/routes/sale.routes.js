const express = require('express');
const saleController = require('../controllers/sale.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', auth, saleController.index);
router.post('/', auth, saleController.create);

module.exports = router;
