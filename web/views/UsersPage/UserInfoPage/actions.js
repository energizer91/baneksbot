import Request from '../../../common/request';
import {REQUEST_USER, RECEIVE_USER} from './constants';

function requestUser (id) {
    return {
        type: REQUEST_USER,
        id
    }
}

function receiveUser (user) {
    return {
        type: RECEIVE_USER,
        user,
        receivedAt: Date.now()
    }
}

export function fetchUser (id) {
    return function (dispatch) {
        dispatch(requestUser(id));

        return new Request('/api/users/' + id, {
            method: 'GET',
            json: true
        }).then(user => dispatch(receiveUser(user)))
    }
}