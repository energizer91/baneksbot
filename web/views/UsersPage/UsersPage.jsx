import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers, changeFilter, fetchUsersStatistics, fetchMessagesStatistics } from './actions';
import StatisticsChart from '../../components/StatisticsChart/StatisticsChart';
import { browserHistory } from 'react-router';

class UsersPage extends React.Component {
    constructor(props) {
        super(props);

        this.loadUsers = this.loadUsers.bind(this);
        this.compileStatistics = this.compileStatistics.bind(this);
        this.loadStatistics = this.loadStatistics.bind(this);
        this.loadMessagesStatistics = this.loadMessagesStatistics.bind(this);
        this.openUser = this.openUser.bind(this);
        this.onFilterChange = this.onFilterChange.bind(this);
        this.onLimitChange = this.onLimitChange.bind(this);
    }

    loadUsers(offset, limit) {
        this.props.dispatch(fetchUsers(offset, limit));
    }

    compileStatistics() {
        if (!(this.props.users.statistics && this.props.users.statistics.items && this.props.users.statistics.items.length)) {
            return [];
        }

        let newly_subscribed = [],
            new_users = [],
            unsubscribed = [];

        this.props.users.statistics.items.forEach((stat) => {
            newly_subscribed.push([stat.date, stat.newly_subscribed]);
            new_users.push([stat.date, stat['new']]);
            unsubscribed.push([stat.date, stat.unsubscribed]);
        });


        return [
            {
                name: 'Subscribed',
                values: newly_subscribed
            },
            {
                name: 'New',
                values: new_users
            },
            {
                name: 'Unsubscribed',
                color: 'red',
                values: unsubscribed
            }
        ]
    }

    loadStatistics(from, to) {
        return this.props.dispatch(fetchUsersStatistics(from, to));
    }
    loadMessagesStatistics(from, to) {
        return this.props.dispatch(fetchMessagesStatistics(from, to));
    }

    openUser(rowNumber) {
        browserHistory.push('/users/' + this.props.users.items[rowNumber]._id);
    }

    onFilterChange(event, filter) {
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
                <StatisticsChart data={this.compileStatistics()} onGetData={this.loadStatistics}/>
                <StatisticsChart
                    data={[
                        {
                            name: 'Received',
                            values: (this.props.users.messages.items || []).map(({date, received}) => [date, received])
                        }
                    ]}
                    onGetData={this.loadMessagesStatistics}
                />
                <UserTable
                    onFilterChange={this.onFilterChange}
                    data={this.props.users}
                    name="Users table"
                    onLimitChange={this.onLimitChange}
                    onCellClick={this.openUser}
                    onDataRequest={this.loadUsers}
                />
            </div>
        );
    }
}

export default connect(state => state)(UsersPage);