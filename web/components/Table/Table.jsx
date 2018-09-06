import React from 'react';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import ChevronLeft from 'material-ui/svg-icons/navigation/chevron-left';
import ChevronRight from 'material-ui/svg-icons/navigation/chevron-right';
import LastPage from 'material-ui/svg-icons/navigation/last-page';
import FirstPage from 'material-ui/svg-icons/navigation/first-page';
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
  constructor (props) {
    super(props);
  }

  onFilterChange (event, index, filter) {
    this.props.onFilterChange(filter);
  }

  onLimitChange (event, index, limit) {
    this.props.onDataRequest(this.props.data.offset, limit);
  }

  render () {
    const {offset, limit, total, items} = this.props.data;

    return (
      <div>
        <MaterialTable
          selectable={false}
          multiSelectable={false}
          onCellClick={this.props.onCellClick}
          fixedHeader={true}
          fixedFooter={true}
        >
          <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
            <TableRow>
              {this.props.fields.map((field, i) => (
                <TableHeaderColumn style={field.styles} key={i}>{field.title}</TableHeaderColumn>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody displayRowCheckbox={false}>
            {(items || []).map((item, i) => (
              <TableRow key={i}>
                {this.props.fields.map((field, i) => (
                  <TableRowColumn style={field.styles} key={i}>{item[field.name]}</TableRowColumn>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter adjustForCheckbox={false}>
            <TableRow>
              <TableRowColumn style={styles.footerContent}>
                <IconButton disabled={offset === 0} onClick={this.props.onDataRequest.bind(null, 0, limit)}>
                  <FirstPage />
                </IconButton><IconButton disabled={offset === 0} onClick={this.props.onDataRequest.bind(null, offset - limit, limit)}>
                  <ChevronLeft />
                </IconButton>
                <IconButton disabled={offset + limit >= total} onClick={this.props.onDataRequest.bind(null, offset + limit, limit)}>
                  <ChevronRight />
                </IconButton><IconButton disabled={offset + limit >= total} onClick={this.props.onDataRequest.bind(null, total - limit, limit)}>
                  <LastPage />
                </IconButton>
              </TableRowColumn>
              <TableRowColumn style={styles.footerText}>
                {Math.min((offset + 1), total) + '-' + Math.min((offset + limit), total) + ' of ' + total}
              </TableRowColumn>
              <TableRowColumn style={styles.footerContent}>
                <SelectField
                  style={{
                    width: '80px',
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
  name: React.PropTypes.string.isRequired,
  items: React.PropTypes.object.isRequired,
  fields: React.PropTypes.array.isRequired
};

export default Table;
