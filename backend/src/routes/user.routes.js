const express = require('express');
const ROLES = require('../config/roles');
const userController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', auth, requireRole(ROLES.ADMIN), userController.index);
router.post('/', auth, requireRole(ROLES.ADMIN), userController.create);
router.put('/:id', auth, requireRole(ROLES.ADMIN), userController.update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN), userController.delete);

module.exports = router;
