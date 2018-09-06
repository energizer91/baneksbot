import React, { PropTypes } from 'react';
import AppBar from 'material-ui/AppBar';
import Drawer from 'material-ui/Drawer';
import MenuItem from 'material-ui/MenuItem';
import { browserHistory } from 'react-router';
import Menu from 'material-ui/Menu';

class Base extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      drawerOpen: false
    }
  }

    toggleDrawer = () => this.setState({drawerOpen: !this.state.drawerOpen});

    handleMenuItem = (event, value) => {
      this.setState({
        drawerOpen: false
      });

      if (value) {
        browserHistory.push(value);
      }
    };

    render () {
      return (
        <div>
          <AppBar
            title="Baneks Admin"
            onLeftIconButtonTouchTap={this.toggleDrawer}
          />
          <Drawer
            docked={false}
            width={200}
            open={this.state.drawerOpen}
            onRequestChange={(drawerOpen) => this.setState({drawerOpen})}
          >
            <Menu onChange={this.handleMenuItem}>
              <MenuItem value="/">Dashboard</MenuItem>
              <MenuItem value="/users">Users</MenuItem>
              <MenuItem value="/aneks">Aneks</MenuItem>
            </Menu>
          </Drawer>
          <div style={{margin: '40px'}}>
            {this.props.children}
          </div>
        </div>
      );
    }
}

Base.propTypes = {
  children: PropTypes.object.isRequired
};

export default Base;
