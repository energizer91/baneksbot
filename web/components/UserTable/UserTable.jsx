import React from 'react';
import Table from '../Table/Table';
import MenuItem from 'material-ui/MenuItem';
import IconMenu from 'material-ui/IconMenu';
import IconButton from 'material-ui/IconButton';
import FilterList from 'material-ui/svg-icons/content/filter-list';

import './UserTable.css';

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

const filters = [
    {
        value: 'all',
        title: 'All'
    },
    {
        value: 'subscribed',
        title: 'Subscribed'
    },
    {
        value: 'banned',
        title: 'Banned'
    }
];

const UserTable = (props) => (
    <div>
        <div className="header">
            <span className="title">{props.name}</span>
            <div className="pull-right">
                <IconMenu
                    iconButtonElement={<IconButton><FilterList /></IconButton>}
                    onChange={props.onFilterChange}
                    value={props.data.filter}
                >
                    {filters.map((filter, i) => (
                        <MenuItem value={filter.value} key={i} primaryText={filter.title} />
                    ))}
                </IconMenu>
            </div>
        </div>
        <Table {...props} fields={fields}/>
    </div>
);

export default UserTable;