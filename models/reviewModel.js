const mongoose = require('mongoose');
const Tour = require('./tourModel');

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

// each combination of tour and user must be unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

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

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, // match all documents with tour equal to tourId
    },
    {
      $group: {
        _id: '$tour', // group all documents by tour
        nRating: { $sum: 1 }, // calculate the sum of all documents
        avgRating: { $avg: '$rating' }, // calculate the average of all ratings
      },
    },
  ]);
  console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating, // stats is an array with only one element
      ratingsAverage: stats[0].avgRating, // stats is an array with only one element
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // this points to the current review
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  // this points to the current query
  this.r = await this.findOne(); // save the current review to the query
  //console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // this.findOne() does not work here because the query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
