import {REQUEST_ANEKS, RECEIVE_ANEKS} from './constants';

export default function aneks (state = {
  isFetching: false,
  offset: 0,
  limit: 10,
  total: 0,
  items: []
}, action) {
  switch (action.type) {
    case REQUEST_ANEKS:
      return Object.assign({}, state, {
        isFetching: true,
        offset: action.offset || state.offset,
        limit: action.limit || state.limit
      });
    case RECEIVE_ANEKS:
      return Object.assign({}, state, {
        isFetching: false,
        items: action.items,
        total: action.total,
        offset: action.offset,
        limit: action.limit,
        receivedAt: action.receivedAt
      });
    default:
      return state;
  }
}
