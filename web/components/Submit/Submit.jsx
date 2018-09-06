import React from 'react';

import Input from '../Input/Input';

class Submit extends React.Component {
  render () {
    return <Input type="submit" label={this.props.label}/>
  }
}

export default Submit;
