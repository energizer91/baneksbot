import {REQUEST_ANEKS, RECEIVE_ANEKS} from './constants';

export default function aneks (state = {
    isFetching: false,
    range: {
        offset: 0,
        limit: 10
    },
    items: []
}, action) {
    switch (action.type) {
        case REQUEST_ANEKS:
            return Object.assign({}, state, {
                isFetching: true,
                range: action.range
            });
        case RECEIVE_ANEKS:
            return Object.assign({}, state, {
                isFetching: false,
                items: action.items,
                receivedAt: action.receivedAt
            });
        default:
            return state;
    }
}