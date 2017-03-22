import {REQUEST_USER, RECEIVE_USER} from './constants';

export default function users (state = {
                                   isFetching: false,
                                   id: null,
                                   userInfo: null
                               }, action) {
    switch (action.type) {
        case REQUEST_USER:
            return Object.assign({}, state, {
                isFetching: true,
                id: action.id
            });
        case RECEIVE_USER:
            return Object.assign({}, state, {
                isFetching: false,
                userInfo: action.userInfo,
                receivedAt: action.receivedAt
            });
        default:
            return state;
    }
}