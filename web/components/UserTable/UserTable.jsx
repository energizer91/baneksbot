import React from 'react';
import Table from '../Table/Table';

const fields = [
    {
        name: 'user_id',
        title: 'ID',
        styles: {
            width: '90px'
        }
    },
    {
        name: 'username',
        title: 'Username'
    },
    {
        name: 'first_name',
        title: 'First name'
    },
    {
        name: 'last_name',
        title: 'Last name'
    }
];

const UserTable = (props) => (
    <Table {...props} fields={fields}/>
);

export default UserTable;