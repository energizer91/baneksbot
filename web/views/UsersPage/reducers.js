import {REQUEST_USERS, RECEIVE_USERS, CHANGE_FILTER} from './constants';
import userInfo from './UserInfoPage/reducers';


function users (state = {
    isFetching: false,
    offset: 0,
    limit: 10,
    filter: 'all',
    total: 0,
    items: []
}, action) {
    switch (action.type) {
        case REQUEST_USERS:
            return Object.assign({}, state, {
                isFetching: true,
                offset: action.offset || state.offset,
                limit: action.limit || state.limit
            });
        case RECEIVE_USERS:
            return Object.assign({}, state, {
                isFetching: false,
                items: action.items,
                total: action.total,
                offset: action.offset,
                limit: action.limit,
                receivedAt: action.receivedAt
            });
        case CHANGE_FILTER:
            return Object.assign({}, state, {
                filter: action.filter
            });
        default:
            return state;
    }
}

export default {
    users,
    userInfo
};

