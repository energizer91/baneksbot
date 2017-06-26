import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers, changeFilter, fetchUsersStatistics } from './actions';
import { AreaChart } from 'rd3';
import { browserHistory } from 'react-router';

class UsersPage extends React.Component {
    constructor(props) {
        super(props);

        this.loadUsers = this.loadUsers.bind(this);
        this.compileStatistics = this.compileStatistics.bind(this);
        this.loadStatistics = this.loadStatistics.bind(this);
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
            new_users = [];

        this.props.users.statistics.items.forEach((stat) => {
            newly_subscribed.push([stat.date, stat.newly_subscribed]);
            new_users.push([stat.date, stat['new']]);
        });


        return [
            {
                name: 'Subscribed',
                values: newly_subscribed
            },
            {
                name: 'New',
                values: new_users
            }
        ]
    }

    loadStatistics(from, to) {
        return this.props.dispatch(fetchUsersStatistics(from, to));
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
        const now = new Date();
        this.loadUsers();
        this.loadStatistics(new Date(now).setHours(0, 0, 0, 0), now.getTime());
    }

    render() {
        return (
            <div>
                <AreaChart
                    viewBoxObject={{
                        x: 0,
                        y: 0,
                        height: 400,
                        width: 800
                    }}
                    width={'100%'}
                    height={600}
                    data={this.compileStatistics()}
                    xAxisTickInterval={{unit: 'minute', interval: 5}}
                    xAxisLabel="Time"
                    xAccessor={(d)=> {
                        return new Date(d[0]).getHours();
                    }}
                    yAccessor={(d)=>{
                        return d[1];
                    }}
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