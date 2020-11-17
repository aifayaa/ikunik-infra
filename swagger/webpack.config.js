const path = require('path');
const { DefinePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const outputPath = path.resolve(__dirname, 'dist');

const mode = process.env.NODE_ENV || 'development';

module.exports = {
  mode,
  entry: {
    app: './src/index.js',
  },
  module: {
    rules: [
      {
        test: /\.y(a)?ml$/,
        use: [
          { loader: 'json-loader' },
          { loader: 'yaml-loader' },
        ],
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin([
      outputPath,
    ]),
    new HtmlWebpackPlugin({
      template: 'index.html',
    }),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(mode),
    }),
  ],
  output: {
    filename: '[name].bundle.js',
    path: outputPath,
  },
};
