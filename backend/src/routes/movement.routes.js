const express = require('express');
const ROLES = require('../config/roles');
const movementController = require('../controllers/movement.controller');
const auth = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', auth, requireRole(ROLES.ADMIN, ROLES.ALMACENERO), movementController.index);
router.post('/', auth, requireRole(ROLES.ADMIN, ROLES.ALMACENERO), movementController.create);

module.exports = router;
