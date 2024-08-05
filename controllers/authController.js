// const util = require('util');
const { promisify } = require('util');

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const checkSecurity =
    req.secure || req.headers['x-forwarded-proto'] === 'https';
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60
    ),
    httpOnly: true,
    secure: checkSecurity, //true if we're on https
  };

  //usually req.secure checks if we're on https,
  //but not with heroku
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined; //removes the password from output
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  //this way we limit the data we accept
  //we won't accept if hackers change their role: admin.
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  const token = signToken(newUser._id);

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password'), 400);
  }

  //2) Check if User exists && password is correct
  const user = await User.findOne({ email: email }).select('+password');
  //^^the select('+password') is to select hidden fields to see if it's correct

  //I used the user.correctpass... doc instance method here
  //because it will exit before if there's no user.
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401)); //401 is unauthorized
  }
  const token = signToken(user._id);
  //3)If everything is ok, send token to client.

  createSendToken(user, 200, req, res);
});

exports.logout = async (req, res) => {
  // res.cookie('jwt', null, {
  //   expire: new Date(Date.now() - 1000 * 10),
  //   httpOnly: true,
  // });
  res.clearCookie('jwt');
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError("You're not logged in! Please login to get access", 401)
    );
  }
  //2) Verificating the token
  // we promisify so we can await the result

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //the two double parenthisis means that promisify returns a function, (promisified verify)
  //and then what returns is called immediatelly with the next () as arguments

  //3) Check if User still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError('The user no longer exists', 401));
  }

  //4) Check if user changed password after JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    //iat means issued at
    return next(
      new AppError('User recently changed password, Please login again', 401)
    );
  }
  //GRANTED ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

//THIS IS ONLY FOR RENDERED PAGES, not to protect since there's no errors
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt && req.cookies.jwt != null) {
    //1) Getting token and check if it's there
    const token = req.cookies.jwt;
    //2) Verificating the token
    // we promisify so we can await the result
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    //the two double parenthisis means that promisify returns a function, (promisified verify)
    //and then what returns is called immediatelly with the next () as arguments

    //3) Check if User still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next();
    }

    //4) Check if user changed password after JWT was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      //iat means issued at
      return next();
    }
    //THERE IS A LOGGED IN USER
    res.locals.user = currentUser;
    return next();
  }
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // ...roles is an array like ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) 📑Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false }); //doesn't require password validation

  try {
    // 2) 📑Generate the random token
    //📑 Send it over to user email

    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    // 📑if there's errors, this try/catch clears up the reset tokens
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(`There was an error sending the email, Try again later`, 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)📑 Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //params because the token is in the URL

  //2)📑 If token has not expired and there's a user,
  if (!user) {
    next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // set the new password
  //3)📑 Update changedPasswordAt property for the user
  // we did this in pre-middleware in userModel

  //4)📑 Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) 📑 Get user from collection with the password
  const user = await User.findById(req.user.id).select('+password');
  //2) 📑 Check if POSTed current password is correct
  if (
    !(await user.correctPassword(req.body.data.passwordCurrent, user.password))
  ) {
    return next(new AppError('Your current password is wrong!', 401));
  }
  //3) 📑 If it is, update password

  user.password = await req.body.data.password;
  user.passwordConfirm = await req.body.data.passwordConfirm;
  //user.passwordChangedAt = Date.now(); doing it with a pre doc middleware
  await user.save();
  //User.findByIdAndUpdate will not work as intended
  //because it will skip pre middleware and doc validators
  //4) 📑 Log user in, send JWT

  createSendToken(user, 200, req, res);
});
