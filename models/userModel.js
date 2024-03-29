const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
/*  
Create a schema for the user model.
Containing: namem email, photo, password, passwordConfirm
*/

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
    trim: true,
    // maxlength: [40, 'A user name must have less or equal than 40 characters'],
    // minlength: [10, 'A user name must have more or equal than 10 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    trim: true,
    lowercase: true,
    //validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'A password must have more or equal than 8 characters'],
    //maxlength: [40, 'A password must have less or equal than 40 characters'],
    //validate: [validator.isStrongPassword, 'Please provide a strong password'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    select: false,
    required: [true, 'Please confirm your password'],
    validate: {
      //  // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean, // Boolean: true or false
    default: true,
    select: false, // hide this field from the output
  },
});

userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  // if the password is not modified or if the document is new, then we return next()
  if (!this.isModified('password') || this.isNew) return next();

  // if the password is modified, then we set the passwordChangedAt property to the current time
  this.passwordChangedAt = Date.now() - 1000; // subtract 1 second to make sure the token is always created after the passwordChangedAt property

  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } }); // find all the documents where the active property is not equal to false
  next();
});

// instance method: available on all documents of a certain collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // 100 < 200
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // create a random string

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex'); // encrypt the random string

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
