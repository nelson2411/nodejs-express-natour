const path = require('path'); // core module that deals with paths
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitze = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

app.set('view engine', 'pug'); // set the view engine to pug
app.set('views', path.join(__dirname, 'views')); // set the views directory to the views folder

// 1) global Middlewares
app.use(express.static(path.join(__dirname, 'public'))); // serve static files

app.use(helmet()); // set security HTTP headers

console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100, // 100 requests from the same IP in one hour
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter); // apply the limiter middleware to all the routes that start with /api

// Morgan is a middleware that logs the request to the console
// express.json() is a middleware that parses the body of the request and puts it into req.body
app.use(
  express.json({
    limit: '10kb', // limit the size of the body to 10kb
  })
);

// Data sanitization against NoSQL query injection
app.use(mongoSanitze());

// Data sanitization against XSS Cross Site Scripting attacks
app.use(xss());

app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
); // Prevent parameter pollution

/* a middleware function requires a third parameter called
next which is a function that tells the middleware to move
*/

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.headers);
  next();
});

// 3) Routes
app.use('/', viewRouter); // mount the router on the / path
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// Unhandling routes

// app.all is a middleware that handles all HTTP methods
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   // req.originalUrl is the url that the user requested
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler); // global error handling middleware

module.exports = app;
