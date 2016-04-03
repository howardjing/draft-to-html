var webpack = require('webpack');
var CleanPlugin = require('clean-webpack-plugin');
var path = './public/dist';

var config = {
  entry: ['babel-polyfill', './src/index.js'],
  output: {
    path: path,
    filename: 'bundle.js',
    publicPath: '/dist',
  },
  plugins: [
    new CleanPlugin([path]),
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: ['babel'],
      },
    ],
  },
  devTool: 'eval-source-map',
  devServer: {
    progress: true,
    stats: {
      colors: true,
      chunks: false,
    },
    contentBase: 'public',
  }
};

config.plugins.push(
  new webpack.DefinePlugin({
    __DEV__: true
  })
);

module.exports = config;
