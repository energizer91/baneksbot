import React from 'react';
import Table from '../Table/Table';

const fields = [
    {
        name: 'post_id',
        title: 'Post ID',
        styles: {
            width: '90px'
        }
    },
    {
        name: 'text',
        title: 'text'
    },
    {
        name: 'likes',
        title: 'likes',
        styles: {
            width: '90px'
        }
    },
    {
        name: 'reposts',
        title: 'Reposts',
        styles: {
            width: '90px'
        }
    }
];

const AnekTable = (props) => (
    <Table {...props} fields={fields}/>
);

export default AnekTable;