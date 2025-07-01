const express = require('express');
const router = express.Router();

// For this emergency system, we're keeping authentication minimal
// Real implementation might include healthcare provider authentication

router.post('/verify-phone', async (req, res) => {
    // This is handled by the emergency routes
    res.redirect('/api/emergency/verify-phone');
});

module.exports = router;