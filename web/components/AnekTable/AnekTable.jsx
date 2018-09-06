import React from 'react';
import Table from '../Table/Table';

const fields = [
  {
    name: 'post_id',
    title: 'Post ID',
    styles: {
      width: '70px'
    }
  },
  {
    name: 'text',
    title: 'Text'
  },
  {
    name: 'likes',
    title: 'likes',
    styles: {
      width: '50px'
    }
  },
  {
    name: 'reposts',
    title: 'Reposts',
    styles: {
      width: '50px'
    }
  }
];

const AnekTable = (props) => (
  <Table {...props} fields={fields}/>
);

export default AnekTable;
