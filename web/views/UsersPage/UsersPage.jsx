import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers } from './actions';

class UsersPage extends React.Component {
    constructor(props) {
        super(props);

        this.skipPage = this.skipPage.bind(this);
    }

    skipPage(range) {
        this.props.dispatch(fetchUsers(range));
    }

    componentDidMount() {
        this.skipPage();
    }

    render() {
        return (
            <div>
                <h1>Users info</h1>
                <UserTable entity="users" users={(this.props.users.items)}/>
            </div>
        );
    }
}

export default connect(state => state)(UsersPage);