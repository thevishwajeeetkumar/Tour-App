import axios from 'axios';

import { showAlert } from './alerts';

export const updateUserSettings = async (data, type) => {
  //Type is either password or data
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';
    //console.log(url);
    const res = await axios({
      method: 'PATCH',
      url: url,
      data,
    });
    if (res.data.status === 'success') {
      const message = `${type} updated successfully`;
      showAlert('success', message);
      window.setTimeout(() => {
        //redirection to same page
        //  location.reload();
      }, 1100);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
