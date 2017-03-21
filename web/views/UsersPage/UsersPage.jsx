import React from 'react';
import UserTable from '../../components/UserTable/UserTable';
import Request from '../../common/request';

class UsersPage extends React.Component {
    constructor(props) {
        super(props);

        this.skipStep = 1;

        this.state = {
            users: [],
            offset: 0,
            limit: this.skipStep
        };



        this.skipPage = this.skipPage.bind(this);
    }

    skipPage(params) {
        return new Request('/api/users', {
            method: 'GET',
            body: params,
            json: true
        }).then(function (response) {
            this.setState({
                ...params,
                users: response
            })
        }.bind(this));
    }

    componentDidMount() {
        this.skipPage({offset: this.state.offset, limit: this.state.limit});
    }

    render() {
        return (
            <div>
                <h1>User info</h1>
                <div onClick={this.skipPage.bind(this, {offset: this.state.offset + this.skipStep, limit: this.state.limit})}>Next 10</div>
                <div onClick={this.skipPage.bind(this, {offset: this.state.offset - this.skipStep, limit: this.state.limit})}>Prev 10</div>
                <UserTable users={this.state.users}/>
            </div>
        );
    }
}

export default UsersPage;