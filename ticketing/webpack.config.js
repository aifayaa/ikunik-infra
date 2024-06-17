const path = require('path');
const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  stats: 'errors-only',
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  devtool: slsw.lib.webpack.isLocal
    ? 'eval-source-map'
    : 'nosources-source-map',
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
    sourceMapFilename: '[file].map',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, '../tsconfig.json'),
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
