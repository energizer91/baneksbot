import Request from '../../common/request';
import {REQUEST_USERS, RECEIVE_USERS} from './constants';

function requestUsers (range) {
    return {
        type: REQUEST_USERS,
        range
    }
}

function receiveUsers (range, items) {
    return {
        type: RECEIVE_USERS,
        range,
        items,
        receivedAt: Date.now()
    }
}

export function fetchUsers (range) {
    return function (dispatch) {
        dispatch(requestUsers(range));

        return new Request('/api/users', {
            method: 'GET',
            body: range,
            json: true
        }).then(items => dispatch(receiveUsers(range, items)))
    }
}