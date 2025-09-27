const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const savedListingController = require('../controllers/savedListingController');

router.use(auth.required);

router.get('/', savedListingController.getSavedListings);
router.post('/', savedListingController.createSavedListing);
router.post('/merge', savedListingController.mergeSavedListings);
router.get('/:id', savedListingController.getSavedListing);
router.put('/:id', savedListingController.updateSavedListing);
router.patch('/:id', savedListingController.updateSavedListing);
router.delete('/:id', savedListingController.deleteSavedListing);

module.exports = router;
