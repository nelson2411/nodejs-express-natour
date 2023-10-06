const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({
  mergeParams: true,
}); // mergeParams allows us to access the tourId from the tour router

/*
 POST /tour/234fad4/reviews
 POST /reviews

 these two routes are the same, but the first one is more specific. 
 These are examples of nested routes that can be handled by express.
 */
router.route('/').get(reviewController.getAllReviews).post(
  authController.protect,
  authController.restrictTo('user'),
  reviewController.setTourUserIds, // set the tour and user ids before creating the review
  reviewController.createReview
);

router
  .route('/:id')
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
