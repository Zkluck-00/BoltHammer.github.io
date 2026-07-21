const express = require('express');
const ROLES = require('../config/roles');
const reportController = require('../controllers/report.controller');
const auth = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', auth, requireRole(ROLES.ADMIN), reportController.index);

module.exports = router;
