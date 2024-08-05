const crypto = require('crypto'); //built-in node module
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
    maxlength: [40, 'Your name must have less than 40 characters'],
    minlength: [10, 'Your name must have more than 10 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide us your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please fill a valid email address'],
    //could also use match(regex, msg) to validate email
  },
  photo: {
    type: String,
    default: 'default.jpg', //path to the photo
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Required password'],
    minlength: [8, 'Your password must have more than 8 chars'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //IT ONLY WORKS ON Create and SAVE, so we'll need to update by saving
      //and not find and update
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  //the this keyword refers to the current doc, (user)
  if (!this.isModified('password')) return next(); //only runs if password was modified
  //it hashes the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12); //12 refers to how CPU intensive
  //deletes the password confirm field
  this.passwordConfirm = undefined; //deletes password confirm
  next();
});

userSchema.pre('save', function (next) {
  //Resetpassword
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000;
  //📑We subtract one second because
  //when we check if the user changed the password after
  //the token was issued, sometimes The token is issued before
  //changedpasswordAt timestamp is issued.
  next();
});

userSchema.pre(/^find/, function (next) {
  //query middleware, it will run before all words that contain find
  //this points to the current query and deselects inactive users
  this.find({ active: { $ne: false } });
  next();
});

//instance method, available on all user documents
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    //console.log(this.passwordChangedAt, JWTTimestamp); //not parsed
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    //return true if the token was after changed password.
    return JWTTimestamp < changedTimeStamp;
  }
  // false means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  //console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
