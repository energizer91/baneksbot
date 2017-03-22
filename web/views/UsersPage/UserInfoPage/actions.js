import Request from '../../../common/request';
import {REQUEST_USER, RECEIVE_USER} from './constants';

function requestUser (range) {
    return {
        type: REQUEST_USER,
        range
    }
}

function receiveUser (range, items) {
    return {
        type: RECEIVE_USER,
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