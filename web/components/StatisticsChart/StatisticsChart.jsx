/**
 * Created by energizer on 27.06.17.
 */

import React from 'react';
import { AreaChart } from 'rd3';

export default class StatisticsChart extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            from: new Date().setHours(0, 0, 0, 0),
            to: new Date().getTime(),
            tickUnit: 'hour',
            tickInterval: 1
        }
    }

    componentDidMount() {
        this.props.onGetData.call(this, this.state.from, this.state.to);
    }

    render() {
        return (
            <div>
                <input type="text" value={this.state.from} onChange={({target}) =>{this.setState({from: target.value})}}/>
                <input type="text" value={this.state.to} onChange={({target}) =>{this.setState({to: target.value})}}/>
                <input type="text" value={this.state.tickUnit} onChange={({target}) =>{this.setState({tickUnit: target.value})}}/>
                <input type="text" value={this.state.tickInterval} onChange={({target}) =>{this.setState({tickInterval: target.value})}}/>
                <button onClick={this.props.onGetData.bind(this, this.state.from, this.state.to)}>Get</button>
                <AreaChart
                    viewBoxObject={{
                        x: 0,
                        y: 0,
                        height: 400,
                        width: 800
                    }}
                    width={'100%'}
                    legend={true}
                    interpolate={true}
                    height={600}
                    data={this.props.data}
                    xAxisTickInterval={{unit: this.state.tickUnit, interval: this.state.tickInterval}}
                    xAxisLabel="Time"
                    xAccessor={(d)=> {
                        return new Date(d[0]);
                    }}
                    yAccessor={(d)=>{
                        return d[1];
                    }}
                />
            </div>
        )
    }
}

StatisticsChart.propTypes = {
    data: React.PropTypes.array.isRequired,
    onGetData: React.PropTypes.func.isRequired
};