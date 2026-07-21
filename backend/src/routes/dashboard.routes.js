const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', auth, dashboardController.index);

module.exports = router;
