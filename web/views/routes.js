import Base from './Base/Base';
import HomePage from './HomePage/HomePage';
import NotFound from './NotFound/NotFound';
import UsersPage from './UsersPage/UsersPage';
import AneksPage from './AneksPage/AneksPage';

const routes = {
    // base component (wrapper for the whole application).
    component: Base,
    childRoutes: [
        {
            path: '/',
            component: HomePage
        },
        {
            path: '/users',
            component: UsersPage
        },
        {
            path: '/aneks',
            component: AneksPage,
            childRoutes: [
                {
                    path: '/:anekid',
                    component: HomePage
                }
            ]
        },
        {
            path: '*',
            component: NotFound
        }
    ]
};

export default routes;