import React from 'react';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';

const UserTable = (props) => (
    <div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHeaderColumn>ID</TableHeaderColumn>
                    <TableHeaderColumn>Username</TableHeaderColumn>
                    <TableHeaderColumn>First name</TableHeaderColumn>
                    <TableHeaderColumn>Last name</TableHeaderColumn>
                </TableRow>
            </TableHeader>
            <TableBody>
                {props.users.map((user, i) => (
                    <TableRow key={i}>
                        <TableRowColumn>{user.user_id}</TableRowColumn>
                        <TableRowColumn>{user.username}</TableRowColumn>
                        <TableRowColumn>{user.first_name}</TableRowColumn>
                        <TableRowColumn>{user.last_name}</TableRowColumn>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);

export default UserTable;