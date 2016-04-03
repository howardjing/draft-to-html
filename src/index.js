import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Editor from './editor';

const App = () => (
  <div>
    <h1>An editor</h1>
    <Editor />
  </div>
);

ReactDOM.render(
  <App />,
  document.querySelector('#container')
)
