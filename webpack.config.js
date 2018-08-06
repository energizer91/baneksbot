/**
 * Created by energizer on 21.03.17.
 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
  template: path.join(__dirname, 'web', 'index.html'),
  filename: 'index.html',
  inject: 'body'
});

module.exports = {
  context: path.join(__dirname, 'web'),
  entry: './App.jsx',
  output: {
    path: path.join(__dirname, 'bundle'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015', 'react', 'stage-2']
        }
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },

  plugins: [HTMLWebpackPluginConfig]
};
