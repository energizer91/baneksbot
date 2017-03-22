import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers } from './actions';
import { browserHistory } from 'react-router';

class UsersPage extends React.Component {
    constructor(props) {
        super(props);

        this.skipPage = this.skipPage.bind(this);
        this.openUser = this.openUser.bind(this);
    }

    skipPage(range) {
        this.props.dispatch(fetchUsers(range));
    }

    openUser(rowNumber) {
        browserHistory.push('/users/' + this.props.users.items[rowNumber]._id);
    }

    componentDidMount() {
        this.skipPage();
    }

    render() {
        return (
            <div>
                <h1>Users info</h1>
                <UserTable onCellClick={this.openUser} entity="users" users={(this.props.users.items)}/>
            </div>
        );
    }
}

export default connect(state => state)(UsersPage);