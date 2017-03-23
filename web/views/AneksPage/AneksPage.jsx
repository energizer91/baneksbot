import React from 'react';
import AnekTable from '../../components/AnekTable/AnekTable';
import { connect } from 'react-redux';
import { fetchAneks } from './actions';

class AneksPage extends React.Component {
    constructor(props) {
        super(props);

        this.loadAneks = this.loadAneks.bind(this);
        this.onLimitChange = this.onLimitChange.bind(this);
    }

    loadAneks(offset, limit) {
        this.props.dispatch(fetchAneks(offset, limit));
    }

    onLimitChange(event, index, limit) {
        this.loadAneks(this.props.aneks.offset, limit);
    }

    componentDidMount() {
        this.loadAneks();
    }

    render() {
        return (
            <div>
                <h1>Aneks info</h1>
                <AnekTable
                    entity="aneks"
                    onLimitChange={this.onLimitChange}
                    onDataRequest={this.loadAneks}
                    data={(this.props.aneks)}
                />
            </div>
        );
    }
}

export default connect(state => state)(AneksPage);