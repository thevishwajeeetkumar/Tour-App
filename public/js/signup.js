/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Sign up successful');
      window.setTimeout(() => {
        //redirection
        location.assign('/');
      }, 1000);
    }
  } catch (err) {
    const error = err.response.data.message;
    showAlert('error', error);
  }
};
