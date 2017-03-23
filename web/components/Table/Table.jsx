import React from 'react';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import ChevronLeft from 'material-ui/svg-icons/navigation/chevron-left';
import ChevronRight from 'material-ui/svg-icons/navigation/chevron-right';
import {Table as MaterialTable, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn, TableFooter} from 'material-ui/Table';

const styles = {
    footerContent: {
        float: 'right'
    },
    footerText: {
        float: 'right',
        paddingTop: 16,
        height: 16
    }
};

const ranges = [10, 20, 50, 100];

class Table extends React.Component {
    constructor(props) {
        super(props);
    }

    onFilterChange(event, index, filter) {
        this.props.onFilterChange(filter);
    }

    onLimitChange(event, index, limit) {
        this.props.onDataRequest(this.props.data.offset, limit);
    }

    render() {
        const {offset, limit, total, items} = this.props.data;

        return (
            <div>
                <MaterialTable selectable={false} multiSelectable={false} onCellClick={this.props.onCellClick}>
                    <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
                        <TableRow>
                            {Object.keys(this.props.fields).map((field, i) => (
                                <TableHeaderColumn key={i}>{this.props.fields[field]}</TableHeaderColumn>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody displayRowCheckbox={false}>
                        {(items || []).map((item, i) => (
                            <TableRow key={i}>
                                {Object.keys(this.props.fields).map((field, i) => (
                                    <TableRowColumn key={i}>{item[field]}</TableRowColumn>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter adjustForCheckbox={false}>
                        <TableRow>
                            <TableRowColumn style={styles.footerContent}>
                                <IconButton disabled={offset === 0} onClick={this.props.onDataRequest.bind(null, offset - limit, limit)}>
                                    <ChevronLeft />
                                </IconButton>
                                <IconButton disabled={offset + limit >= total} onClick={this.props.onDataRequest.bind(null, offset + limit, limit)}>
                                    <ChevronRight />
                                </IconButton>
                            </TableRowColumn>
                            <TableRowColumn style={styles.footerText}>
                                {Math.min((offset + 1), total) + '-' + Math.min((offset + limit), total) + ' of ' + total}
                            </TableRowColumn>
                            <TableRowColumn style={styles.footerContent}>
                                <SelectField
                                    style={{
                                        width: '50px',
                                        fontSize: '13px'
                                    }}
                                    underlineStyle={{
                                        display: 'none'
                                    }}
                                    value={limit}
                                    onChange={this.props.onLimitChange}
                                >
                                    {ranges.map((range, i) => (
                                        <MenuItem key={i} value={range} primaryText={range} />
                                    ))}
                                </SelectField>
                            </TableRowColumn>
                            <TableRowColumn style={styles.footerText}>
                                Rows per page:
                            </TableRowColumn>
                        </TableRow>
                    </TableFooter>
                </MaterialTable>
            </div>
        )
    }
}

React.propTypes = {
    onDataRequest: React.PropTypes.func.isRequired,
    onFilterChange: React.PropTypes.func,
    onLimitChange: React.PropTypes.func,
    onCellClick: React.PropTypes.func,
    items: React.PropTypes.object.isRequired
};



export default Table;