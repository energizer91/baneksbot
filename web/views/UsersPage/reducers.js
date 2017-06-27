import {REQUEST_USERS, RECEIVE_USERS, CHANGE_FILTER, REQUEST_USERS_STATISTICS, RECEIVE_USERS_STATISTICS, REQUEST_MESSAGES_STATISTICS, RECEIVE_MESSAGES_STATISTICS} from './constants';
import userInfo from './UserInfoPage/reducers';


function users (state = {
    isFetching: false,
    offset: 0,
    limit: 10,
    filter: 'all',
    total: 0,
    items: [],
    statistics: {
        from: 0,
        to: Date.now(),
        items: []
    },
    messages: {
        from: 0,
        to: Date.now(),
        items: []
    }
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
        case REQUEST_USERS_STATISTICS:
            return Object.assign({}, state, {
                statistics: {
                    from: action.from,
                    to: action.to
                }
            });
        case RECEIVE_USERS_STATISTICS:
            return Object.assign({}, state, {
                statistics: {
                    items: action.items
                }
            });
        case REQUEST_MESSAGES_STATISTICS:
            return Object.assign({}, state, {
                messages: {
                    from: action.from,
                    to: action.to
                }
            });
        case RECEIVE_MESSAGES_STATISTICS:
            return Object.assign({}, state, {
                messages: {
                    items: action.items
                }
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

