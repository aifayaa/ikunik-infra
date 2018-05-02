const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.(jsx?)$/,
        loaders: ['babel-loader'],
        include: __dirname,
        exclude: /node_modules/,
      },
      {
        test: /\.(json)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              regExp: /\/([a-z0-9]+)\/[a-z0-9]+\.json$/,
              name: '[path][name].[ext]',
            },
          },
        ],
      },
    ],
  },
};
