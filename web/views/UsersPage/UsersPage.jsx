import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers, changeFilter } from './actions';
import { browserHistory } from 'react-router';

class UsersPage extends React.Component {
    constructor(props) {
        super(props);

        this.loadUsers = this.loadUsers.bind(this);
        this.openUser = this.openUser.bind(this);
        this.onFilterChange = this.onFilterChange.bind(this);
        this.onLimitChange = this.onLimitChange.bind(this);
    }

    loadUsers(offset, limit) {
        this.props.dispatch(fetchUsers(offset, limit));
    }

    openUser(rowNumber) {
        browserHistory.push('/users/' + this.props.users.items[rowNumber]._id);
    }

    onFilterChange(event, index, filter) {
        this.props.dispatch(changeFilter(filter));
        this.loadUsers();
    }

    onLimitChange(event, index, limit) {
        this.loadUsers(this.props.users.offset, limit);
    }

    componentDidMount() {
        this.loadUsers();
    }

    render() {
        return (
            <div>
                <h1>Users info</h1>
                <UserTable
                    onFilterChange={this.onFilterChange}
                    data={this.props.users}
                    onLimitChange={this.onLimitChange}
                    onCellClick={this.openUser}
                    entity="users"
                    onDataRequest={this.loadUsers}
                />
            </div>
        );
    }
}

export default connect(state => state)(UsersPage);