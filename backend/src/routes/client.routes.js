const express = require('express');
const ROLES = require('../config/roles');
const clientController = require('../controllers/client.controller');
const auth = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', auth, clientController.index);
router.post('/', auth, clientController.create);
router.put('/:id', auth, clientController.update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN), clientController.delete);

module.exports = router;
