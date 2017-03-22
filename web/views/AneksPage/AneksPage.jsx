import React from 'react';
import AnekTable from '../../components/AnekTable/AnekTable';
import { connect } from 'react-redux';
import { fetchAneks } from './actions';

const initialState = {
    range: {
        offset: 0,
        limit: 10
    },
    items: []
};

class AneksPage extends React.Component {
    constructor(props) {
        super(props);

        this.skipPage = this.skipPage.bind(this);
    }

    skipPage(range) {
        this.props.dispatch(fetchAneks(range));
    }

    componentDidMount() {
        this.skipPage();
    }

    render() {
        return (
            <div>
                <h1>Aneks info</h1>
                <AnekTable entity="users" aneks={(this.props.aneks.items)}/>
            </div>
        );
    }
}

function mapStateToProps(state = initialState) {
    return state;
}

export default connect(mapStateToProps)(AneksPage);