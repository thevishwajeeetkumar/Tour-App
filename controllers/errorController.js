/* eslint-disable no-console */
const AppError = require('../utils/AppError');

// Error handler functions
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue);
  const value = Object.values(err.keyValue);
  const message = `Duplicate ${field}: ${value}, Please use another ${field}`;

  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError('Invalid token, Please login again', 401);
};
const handleJWTExpired = () => {
  return new AppError('Your token has expired! Please login again', 401);
};

//SENDING ERRORS DEPENDING ON ENVIRONMENT
const sendErrorDev = (err, req, res) => {
  //A) API
  if (req.originalUrl.startsWith('/api')) {
    console.log(`❌ ${err.stack}`);
    console.log('----------');
    console.log('----------');
    console.log('----------');
    console.log(`${err.statusCode} -> ${err.message}`);

    return res.status(err.statusCode).json({
      status: err.status,
      stack: err.stack,
      error: err,
      message: err.message,
    });
  }
  //B) RENDERED WEBSITE
  console.error('❌❌ERROR❌❌', err);

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    message: err.message,
  });
};
const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    //A) API
    //A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    console.error('❌❌ERROR❌❌', err);
    //2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong :/',
    });

    //AB) Programming or other unknown error: don't leak error details
    //1)Log Error
  }
  // B) RENDERED WEBSITE
  //AB) RENDERED OPERATIONAL
  if (err.isOperational) {
    res.status(err.statusCode).render('error', {
      status: err.status,
      message: err.message,
    });
    return;
  }
  //BB) RENDERED WEBSITE/PROGRAMATING ERROR
  //1)Log Error
  console.error('❌❌ERROR❌❌', err);
  //2) Send generic message
  return res.status(500).render('error', {
    status: 'error',
    message: 'Please try again later',
  });
};
module.exports = (err, req, res, next) => {
  //error handling middleware
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  //sending different errors in dev and prod
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message; //we need to do this, because message is a constructor property
    if (err.constructor.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpired();
    sendErrorProd(error, req, res);
  }
};
