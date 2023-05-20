const mongoose = require('mongoose');
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
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'A password must have more or equal than 8 characters'],
    //maxlength: [40, 'A password must have less or equal than 40 characters'],
    //validate: [validator.isStrongPassword, 'Please provide a strong password'],
    //select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    //validate: {
    //  // This only works on CREATE and SAVE!!!
    //  validator: function (el) {
    //    return el === this.password;
    //  },
    //  message: 'Passwords are not the same!',
    //},
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
