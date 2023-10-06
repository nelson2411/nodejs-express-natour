const mongoose = require('mongoose');

/*
Review model consisting of: 
-> review: String
-> rating: Number
-> createdAt: Date
-> ref to tour: ObjectId
-> ref to user: ObjectId
*/

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(), // Date.now() is a function, not a value, so we need to call it
    },
    tour: {
      type: mongoose.Schema.ObjectId, // this is a reference to the Tour model
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId, // this is a reference to the User model
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    // options object
    toJSON: { virtuals: true }, // virtuals are not included in the output by default, so we need to set this option to true
    toObject: { virtuals: true }, // virtuals are not included in the output by default, so we need to set this option to true
  }
);

reviewSchema.pre(/^find/, function (next) {
  // get all the find queries
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  // We reference the review but we don't want to populate the tour. We only want to populate the user.
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
