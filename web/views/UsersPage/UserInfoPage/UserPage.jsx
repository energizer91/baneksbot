import React from 'react';
import { connect } from 'react-redux';
import { fetchUsers } from './../actions';

class UserInfoPage extends React.Component {
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
                <h1>User info</h1>
            </div>
        );
    }
}

function mapStateToProps(state ) => (state) {
    return state;
}

export default connect(mapStateToProps)(UserInfoPage);