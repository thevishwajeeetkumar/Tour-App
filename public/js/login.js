/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'You were successfully logged in');
      window.setTimeout(() => {
        //redirection
        location.assign('/');
      }, 100);
    }
  } catch (err) {
    const error = err.response.data.message;
    showAlert('error', error);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });
    if (res.data.status == 'success') {
      location.reload();
      //showAlert('success', 'You were successfully logged out');
    }
  } catch (err) {
    showAlert('error', 'Error logging out, Try again!');
  }
};
