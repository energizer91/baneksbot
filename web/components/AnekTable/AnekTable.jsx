import React from 'react';
import Table from '../Table/Table';

const fields = {
    post_id: 'Post ID',
    text: 'Text',
    likes: 'Likes',
    reposts: 'Reposts'
};

const AnekTable = (props) => (
    <Table {...props} fields={fields} items={props.aneks}/>
);

export default AnekTable;