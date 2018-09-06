import Request from '../../common/request';
import {REQUEST_ANEKS, RECEIVE_ANEKS} from './constants';

function requestAneks (offset, limit) {
  return {
    type: REQUEST_ANEKS,
    offset,
    limit
  };
}

function receiveAneks (items) {
  return {
    type: RECEIVE_ANEKS,
    ...items,
    receivedAt: Date.now()
  };
}

export function fetchAneks (offset, limit) {
  return function (dispatch) {
    dispatch(requestAneks(offset, limit));
    return new Request('/api/aneks', {
      method: 'GET',
      body: {
        offset,
        limit
      },
      json: true
    }).then(items => dispatch(receiveAneks(items)));
  };
}
