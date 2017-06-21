import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers, changeFilter, fetchUsersStatistics } from './actions';
import { LineChart } from 'react-d3-basic';
import { browserHistory } from 'react-router';

const countChartSeries = [
    {
        field: 'count',
        name: 'Users count',
        color: 'red'
    }
];
const subscribedChartSeries = [
    {
        field: 'subscribed',
        name: 'Subscribed users',
        color: 'red'
    }
];
const x = function (d) {
    return new Date(d.date).getDate();
};
const width = 700;
const height = 300;
const margins = {left: 100, right: 100, top: 50, bottom: 50};

class UsersPage extends React.Component {
    constructor(props) {
        super(props);

        this.loadUsers = this.loadUsers.bind(this);
        this.loadStatistics = this.loadStatistics.bind(this);
        this.openUser = this.openUser.bind(this);
        this.onFilterChange = this.onFilterChange.bind(this);
        this.onLimitChange = this.onLimitChange.bind(this);
    }

    loadUsers(offset, limit) {
        this.props.dispatch(fetchUsers(offset, limit));
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
        this.loadUsers();
        this.loadStatistics();
    }

    render() {
        return (
            <div>
                <LineChart
                    margins= {margins}
                    data={this.props.users.statistics.items || []}
                    width={width}
                    height={height}
                    chartSeries={countChartSeries}
                    x={x}
                />
                <LineChart
                    margins= {margins}
                    data={this.props.users.statistics.items || []}
                    width={width}
                    height={height}
                    chartSeries={subscribedChartSeries}
                    x={x}
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