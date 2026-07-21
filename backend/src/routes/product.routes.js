const express = require('express');
const ROLES = require('../config/roles');
const productController = require('../controllers/product.controller');
const auth = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', auth, productController.index);
router.post('/', auth, requireRole(ROLES.ADMIN), productController.create);
router.put('/:id', auth, requireRole(ROLES.ADMIN), productController.update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN), productController.delete);

module.exports = router;
