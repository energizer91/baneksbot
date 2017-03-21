import React, { PropTypes } from 'react';
import { Link } from 'react-router-dom';
import AppBar from 'material-ui/AppBar';
import FlatButton from 'material-ui/FlatButton';


const Base = ({ children }) => (
    <div>
        <AppBar
            title={<Link to="/">React App</Link>}
            iconElementRight={
                <FlatButton
                    label='Users'
                    containerElement={<Link to="/users" />}
                />
            }
        />
        <div style={{margin: '40px'}}>
            {children}
        </div>
    </div>
);

Base.propTypes = {
    children: PropTypes.array.isRequired
};

export default Base;