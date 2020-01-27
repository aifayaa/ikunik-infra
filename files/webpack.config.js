const path = require('path');
const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  stats: 'errors-only',
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  devtool: 'nosources-source-map',
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
    sourceMapFilename: '[file].map',
  },
  externals: ['sharp'],
};
