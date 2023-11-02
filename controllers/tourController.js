const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

//Get all tours
exports.getAllTours = factory.getAll(Tour);
// Get a single tour
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// Create a new tour
exports.createTour = factory.createOne(Tour);
// Update a tour
exports.updateTour = factory.updateOne(Tour);
// Delete a tour
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }, // match all documents with ratingsAverage greater than or equal to 4.5
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // group all documents by difficulty
        numTours: { $sum: 1 }, // calculate the sum of all documents
        numRatings: { $sum: '$ratingsQuantity' }, // calculate the sum of all ratingsQuantity
        avgRating: { $avg: '$ratingsAverage' }, // calculate the average of all ratingsAverage
        avgPrice: { $avg: '$price' }, // calculate the average of all prices
        minPrice: { $min: '$price' }, // calculate the minimum of all prices
        maxPrice: { $max: '$price' }, // calculate the maximum of all prices
      },
    },
    {
      $sort: { avgPrice: 1 }, // sort the documents by avgPrice in ascending order
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // unwind the startDates array
    },
    {
      $match: {
        // match all documents with startDates greater than or equal to the first day of the year and less than or equal to the last day of the year
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        // group all documents by month
        _id: { $month: '$startDates' },
        // calculate the sum of all documents
        numTourStarts: { $sum: 1 },
        // create an array of all tour names
        tours: { $push: '$name' },
      },
    },
    {
      // add a new field called month with the value of _id
      $addFields: { month: '$_id' },
    },
    {
      // remove the _id field
      $project: { _id: 0 },
    },
    {
      // sort the documents by month in ascending order
      $sort: { numTourStarts: -1 },
    },
    {
      // limit the number of documents to 12
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // radius of the Earth in miles or kilometers
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng)
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  const tours = await Tour.find({
    // calculate the distance from the given coordinates to the startLocation of each tour
    startLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length, // number of tours
    data: {
      data: tours,
    },
  });
});
