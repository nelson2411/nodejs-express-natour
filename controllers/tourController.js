const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  // Execute the query
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    results: tours.length,
    data: {
      tours,
    },
  });
});

// Get a single tour

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});

// Create a new tour

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
});

// Update a tour

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});

// Delete a tour

exports.deleteTour = catchAsync(async (req, res, next) => {
  await Tour.findByIdAndDelete(req.params.id);
  res.status(204).json({
    status: 'success',
    data: null,
    message: 'Tour deleted successfully',
  });
});

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
