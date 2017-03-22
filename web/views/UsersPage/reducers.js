import {REQUEST_USERS, RECEIVE_USERS} from './constants';

export default function users (state = {
    isFetching: false,
    range: {
        offset: 0,
        limit: 10
    },
    items: []
}, action) {
    switch (action.type) {
        case REQUEST_USERS:
            return Object.assign({}, state, {
                isFetching: true,
                range: action.range
            });
        case RECEIVE_USERS:
            return Object.assign({}, state, {
                isFetching: false,
                items: action.items,
                receivedAt: action.receivedAt
            });
        default:
            return state;
    }
}