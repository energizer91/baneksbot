import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import { connect } from 'react-redux';
import { fetchUsers, changeFilter, fetchUsersStatistics } from './actions';
import { LineChart } from 'rd3';
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

        this.state = {
            from: new Date().setHours(0, 0, 0, 0),
            to: new Date().getTime(),
            tickUnit: 'hour',
            tickInterval: 1
        }
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
        this.loadUsers();
        this.loadStatistics(this.state.from, this.state.to);
    }

    render() {
        return (
            <div>
                <input type="text" value={this.state.from} onChange={({target}) =>{this.setState({from: target.value})}}/>
                <input type="text" value={this.state.to} onChange={({target}) =>{this.setState({to: target.value})}}/>
                <input type="text" value={this.state.tickUnit} onChange={({target}) =>{this.setState({tickUnit: target.value})}}/>
                <input type="text" value={this.state.tickInterval} onChange={({target}) =>{this.setState({tickInterval: target.value})}}/>
                <button onClick={() => this.loadStatistics(this.state.from, this.state.to)}>Get</button>
                <LineChart
                    viewBoxObject={{
                        x: 0,
                        y: 0,
                        height: 400,
                        width: 800
                    }}
                    width={'100%'}
                    legend={true}
                    height={600}
                    data={this.compileStatistics()}
                    xAxisTickInterval={{unit: this.state.tickUnit, interval: this.state.tickInterval}}
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