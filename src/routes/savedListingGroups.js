const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const savedListingController = require('../controllers/savedListingController');

router.use(auth.required);

router.get('/', savedListingController.getGroups);
router.post('/', savedListingController.createGroup);
router.put('/:id', savedListingController.updateGroup);
router.patch('/:id', savedListingController.updateGroup);
router.delete('/:id', savedListingController.deleteGroup);

module.exports = router;
