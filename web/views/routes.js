import Base from './Base/Base';
import HomePage from './HomePage/HomePage';
import LoginPage from './LoginPage/LoginPage';

const routes = {
    // base component (wrapper for the whole application).
    component: Base,
    childRoutes: [
        {
            path: '/',
            component: HomePage
        },

        {
            path: '/login',
            component: LoginPage
        }
    ]
};

export default routes;