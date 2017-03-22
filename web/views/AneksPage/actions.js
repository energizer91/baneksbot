import Request from '../../common/request';
import {REQUEST_ANEKS, RECEIVE_ANEKS} from './constants';

function requestAneks (range) {
    return {
        type: REQUEST_ANEKS,
        range
    }
}

function receiveAneks (range, items) {
    return {
        type: RECEIVE_ANEKS,
        range,
        items,
        receivedAt: Date.now()
    }
}

export function fetchAneks (range) {
    return function (dispatch) {
        dispatch(requestAneks(range));

        return new Request('/api/aneks', {
            method: 'GET',
            body: range,
            json: true
        }).then(items => dispatch(receiveAneks(range, items)))
    }
}