const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    'service-worker/index': './src/service-worker/index.ts',
    'content-script/index': './src/content-script/index.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.build.json'
          }
        },
        exclude: [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/, /tests\//],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.LOG_LEVEL': JSON.stringify('INFO'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'images', to: 'images' },
        { from: 'styles.css', to: 'styles.css' },
      ],
    }),
  ],
  optimization: {
    minimize: false, // Don't minimize for easier debugging
    splitChunks: false, // Keep each entry point as a single file
  },
};