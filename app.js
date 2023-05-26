const express = require('express');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// 1) Middleware

console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Morgan is a middleware that logs the request to the console
// express.json() is a middleware that parses the body of the request and puts it into req.body
app.use(express.json());

app.use(express.static(`${__dirname}/public`)); // this is a middleware that serves static files

/* a middleware function requires a third parameter called
next which is a function that tells the middleware to move
*/
app.use((req, res, next) => {
  console.log('Hello from the middleware 👋 👌');
  next();
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.headers);
  next();
});

// 3) Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

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

app.use(globalErrorHandler);

module.exports = app;
