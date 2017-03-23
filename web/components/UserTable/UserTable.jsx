import React from 'react';
import Table from '../Table/Table';

const fields = {
    user_id: 'ID',
    username: 'Username',
    first_name: 'First name',
    last_name: 'Last name'
};

const UserTable = (props) => (
    <div>
        <Table {...props} fields={fields}/>
    </div>
);

export default UserTable;