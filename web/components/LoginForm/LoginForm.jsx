import React from 'react';

import Input from '../Input/Input';
import Submit from '../Submit/Submit';

class LoginForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            login: '',
            loginSent: false,
            pin: '',
            message: 'lol kek cheburek'
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        event.preventDefault();
        this.setState({
            [event.target.name]: event.target.value
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        console.log(event);
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <p>{this.state.message}</p>
                <Input type="text" name="login" handleChange={this.handleChange} label="Login"/>
                <Submit />
            </form>
        )
    }
}

export default LoginForm;