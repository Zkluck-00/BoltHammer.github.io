const express = require('express');
const ROLES = require('../config/roles');
const categoryController = require('../controllers/category.controller');
const auth = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', auth, categoryController.index);
router.post('/', auth, requireRole(ROLES.ADMIN), categoryController.create);
router.put('/:id', auth, requireRole(ROLES.ADMIN), categoryController.update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN), categoryController.delete);

module.exports = router;
