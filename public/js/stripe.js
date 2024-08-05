import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  //we get the tourId from the data-tour-id in the html
  try {
    const stripe = Stripe(
      'pk_test_51INej4LCKkBhLn06de52vz3KRfJeeNhjf3EHAfzJCm0KwOZk3hZ4ANyTf60k6S7VQxUzOLIzy2HNNDqkMEUyO1Yc00KABduvup'
    );
    //1) get checkout session from API endpoint
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    //console.log(session);
    //2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
    showAlert('success', 'payment successfull');
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
