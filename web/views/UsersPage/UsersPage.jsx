import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers, changeFilter, fetchUsersStatistics } from './actions';
import { AreaChart } from 'rd3';
import { browserHistory } from 'react-router';

const countChartSeries = [
    {
        field: 'count',
        name: 'Users count',
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

        let subscribed = [],
            count = [];

        this.props.users.statistics.items.forEach((stat) => {
            subscribed.push([stat.date, stat.subscribed]);
            count.push([stat.date, stat.count]);
        });


        return [
            {
                name: 'Subscribed',
                values: subscribed
            },
            {
                name: 'Count',
                values: count
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
        this.loadUsers();
        this.loadStatistics();
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
                    data={this.compileStatistics()}
                    xAxisTickInterval={{unit: 'minute', interval: 5}}
                    xAxisLabel="Time"
                    xAccessor={(d)=> {
                        return new Date(d[0]);
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