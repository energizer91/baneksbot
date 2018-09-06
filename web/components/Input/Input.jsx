import React from 'react';

class Input extends React.Component {
  render () {
    return (
      <label>
        {this.props.label}
        <input type={this.props.type} name={this.props.name} onChange={this.props.handleChange} />
      </label>
    )
  }
}

export default Input;
