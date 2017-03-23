import Request from '../../common/request';
import {REQUEST_USERS, RECEIVE_USERS, CHANGE_FILTER} from './constants';

function requestUsers (offset, limit) {
    return {
        type: REQUEST_USERS,
        offset,
        limit
    }
}

function receiveUsers (items) {
    return {
        type: RECEIVE_USERS,
        ...items,
        receivedAt: Date.now()
    }
}

function changeUserFilter (filter) {
    return {
        type: CHANGE_FILTER,
        filter
    }
}

export function fetchUsers (offset, limit) {
    return function (dispatch, getState) {
        dispatch(requestUsers(offset, limit));

        return new Request('/api/users', {
            method: 'GET',
            body: {
                offset,
                limit,
                filter: getState().users.filter
            },
            json: true
        }).then(items => dispatch(receiveUsers(items)))
    }
}

export function changeFilter (filter) {
    return function (dispatch) {
        dispatch(changeUserFilter(filter));
    }
}