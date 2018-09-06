import React from 'react';
import DropDownMenu from 'material-ui/DropDownMenu';
import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';
import MenuItem from 'material-ui/MenuItem';

const TableToolbar = (props) => (
  <Toolbar>
    <DropDownMenu value={props.filterValue} onChange={props.onFilterChange}>
      {Object.keys(props.filterFields).map((field, i) => (
        <MenuItem key={i} value={field} primaryText={props.filterFields[field]} />
      ))}
    </DropDownMenu>
  </Toolbar>
);

export default TableToolbar;
