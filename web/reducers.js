import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import users from './views/UsersPage/reducers';
import aneks from './views/AneksPage/reducers';

export default combineReducers({
    users,
    aneks,
    routing: routerReducer
});