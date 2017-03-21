import React from 'react';
import ReactDOM from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import { HashRouter, Route } from 'react-router-dom';
import Base from './views/Base/Base';
import HomePage from './views/HomePage/HomePage';
import LoginPage from './views/LoginPage/LoginPage';
import UsersPage from './views/UsersPage/UsersPage';

import './App.css';

injectTapEventPlugin();

ReactDOM.render((
    <MuiThemeProvider muiTheme={getMuiTheme()}>
        <HashRouter>
            <Base>
                <Route exact path="/" component={HomePage} />
                <Route path="/login" component={LoginPage} />
                <Route path="/users" component={UsersPage} />
            </Base>
        </HashRouter>
    </MuiThemeProvider>
), document.getElementById('root'));