const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

/* 
Review Controller Functions
*/
exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId; // if the tour is not in the body, get it from the url
  if (!req.body.user) req.body.user = req.user.id; // get the user from the protect middleware
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
