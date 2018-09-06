import React from 'react';
import { connect } from 'react-redux';
import { fetchUser } from './actions';

class UserInfoPage extends React.Component {
  constructor (props) {
    super(props);

    this.getUser = this.getUser.bind(this);
  }

  getUser (id) {
    this.props.dispatch(fetchUser(id));
  }

  componentDidMount () {
    this.getUser(this.props.params.userid);
  }

  render () {
    return (
      <div>
        <h1>User info</h1>
        <p>{JSON.stringify(this.props.userInfo)}</p>
      </div>
    );
  }
}

export default connect(state => state)(UserInfoPage);
