import React from 'react';
import {Table as MaterialTable, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';

const Table = (props) => (
    <div>
        <MaterialTable>
            <TableHeader>
                <TableRow>
                    {Object.keys(props.fields).map((field, i) => (
                        <TableHeaderColumn key={i}>{props.fields[field]}</TableHeaderColumn>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {(props.items || []).map((user, i) => (
                    <TableRow key={i}>
                        {Object.keys(props.fields).map((field, i) => (
                            <TableRowColumn key={i}>{user[field]}</TableRowColumn>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </MaterialTable>
    </div>
);

export default Table;