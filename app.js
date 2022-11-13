const express = require('express');
const { json } = require('express/lib/response');
const fs = require('fs');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) Middleware

// Morgan is a middleware that logs the request to the console
app.use(morgan('dev'));
// express.json() is a middleware that parses the body of the request and puts it into req.body
app.use(express.json());

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

const port = 3000;

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// 3) Start the server
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
