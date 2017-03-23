import {REQUEST_USER, RECEIVE_USER} from './constants';

export default function userInfo (state = {
                                   isFetching: false,
                                   id: null,
                                   user: {}
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
                user: action.user,
                receivedAt: action.receivedAt
            });
        default:
            return state;
    }
}