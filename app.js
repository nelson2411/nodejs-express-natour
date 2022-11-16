const express = require('express');
const { json } = require('express/lib/response');
const fs = require('fs');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

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
  next();
});

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
