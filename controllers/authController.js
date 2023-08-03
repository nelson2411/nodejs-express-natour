/* eslint-disable arrow-body-style */
const crypto = require('crypto');
const { promisify } = require('util'); // built-in node module
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

// eslint-disable-next-line arrow-body-style
const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id); // create a token
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 // convert to milliseconds
    ),
    // secure: true, // only send the cookie on an encrypted connection (https)
    httpOnly: true, // the cookie cannot be accessed or modified in any way by the browser
  };
  // only send the cookie on an encrypted connection (https)
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions); // send the cookie

  user.password = undefined; // remove the password from the output

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role, // only admin can set the role
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400)); // 400: bad request
  }

  // 2) Check if user exists && password is correct
  // select('+password') is to select the password field which is set to select: false in userModel.js

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401)); // 401: unauthorized
  }

  // 3) If everything ok, send token to client
  // Meanwhile, create a false token
  createSendToken(user, 200, res);
});

// Protect middleware

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer') // We get the token from the header
  ) {
    token = req.headers.authorization.split(' ')[1]; // split the string into an array of strings
  }
  console.log(token);

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access!', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // jwt.verify is a callback function, so we promisify it
  console.log('decoded: ', decoded);
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists!', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again!', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser; // pass the user to the next middleware
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array, e.g. ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next(); // if the user is admin or lead-guide, then we call next()
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({
    email: req.body.email,
  });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  // createPasswordResetToken() is a method in userModel.js
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // turn off all the validators

  // 3) Send it to user's email
  // req.protocol: http or https
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and 
  passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined; // if there is an error, we need to clear the passwordResetToken and passwordResetExpires
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false }); // turn off all the validators

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on the token
  // encrypt the token in the URL
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // check if the token has not expired
  });
  // 2. If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password; // set the new password
  user.passwordConfirm = req.body.passwordConfirm; // set the new passwordConfirm
  user.passwordResetToken = undefined; // clear the passwordResetToken
  user.passwordResetExpires = undefined; // clear the passwordResetExpires
  await user.save(); // save the user

  // 3. Update changedPasswordAt property for the user

  // 4. Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection
  const user = await User.findById(req.user.id).select('+password'); // req.user.id is from protect middleware

  // 2. Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    // if the current password is not correct
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3. If so, update password
  user.password = req.body.password; // set the new password
  user.passwordConfirm = req.body.passwordConfirm; // set the new passwordConfirm
  await user.save(); // save the user
  // User.findByIdAndUpdate will not work as intended!

  // 4. Log user in, send JWT
  createSendToken(user, 200, res);
});
