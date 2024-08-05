const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a tour'],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a user'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    //just if admin wants to create bookings outside of stripe
    type: Boolean,
    default: true,
  },
});

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({ path: 'tour', select: 'name' });
  next();
});

//TODO: try to user populate
// bookingSchema.virtual('from tour', {
//   ref: 'Tour',
//   localField: 'tour', //the field in Review associated with tours
//   foreignField: '_id',
// });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
