import Request from '../../common/request';
import {REQUEST_USERS, RECEIVE_USERS, CHANGE_FILTER, REQUEST_USERS_STATISTICS, RECEIVE_USERS_STATISTICS, REQUEST_MESSAGES_STATISTICS, RECEIVE_MESSAGES_STATISTICS} from './constants';

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

function requestUsersStatistics (from, to) {
    return {
        type: REQUEST_USERS_STATISTICS,
        from,
        to
    }
}

function receiveUsersStatistics (items) {
    return {
        type: RECEIVE_USERS_STATISTICS,
        items,
        receivedAt: Date.now()
    }
}

export function fetchUsersStatistics (from, to) {
    return function (dispatch) {
        dispatch(requestUsersStatistics(from, to));

        return new Request('/api/statistics/users', {
            method: 'GET',
            body: {
                from,
                to
            },
            json: true
        }).then(items => dispatch(receiveUsersStatistics(items)))
    }
}

function requestMessagesStatistics (from, to) {
    return {
        type: REQUEST_MESSAGES_STATISTICS,
        from,
        to
    }
}

function receiveMessagesStatistics (items) {
    return {
        type: RECEIVE_MESSAGES_STATISTICS,
        items,
        receivedAt: Date.now()
    }
}

export function fetchMessagesStatistics (from, to) {
    return function (dispatch) {
        dispatch(requestMessagesStatistics(from, to));

        return new Request('/api/statistics/messages', {
            method: 'GET',
            body: {
                from,
                to
            },
            json: true
        }).then(items => dispatch(receiveMessagesStatistics(items)))
    }
}

export function changeFilter (filter) {
    return function (dispatch) {
        dispatch(changeUserFilter(filter));
    }
}