const express = require('express');
const ROLES = require('../config/roles');
const supplierController = require('../controllers/supplier.controller');
const auth = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', auth, supplierController.index);
router.post('/', auth, requireRole(ROLES.ADMIN), supplierController.create);
router.put('/:id', auth, requireRole(ROLES.ADMIN), supplierController.update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN), supplierController.delete);

module.exports = router;
