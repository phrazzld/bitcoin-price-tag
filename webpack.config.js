/* eslint-env node */
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
  
  // Enable persistent caching for faster builds
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
    buildDependencies: {
      config: [__filename],
      tsconfig: [
        path.resolve(__dirname, 'tsconfig.json'),
        path.resolve(__dirname, 'tsconfig.build.json')
      ],
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.build.json',
            // Performance optimizations
            transpileOnly: false, // Keep type checking for production builds
            experimentalWatchApi: true, // Faster incremental builds
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
      'process.env.CI': JSON.stringify(false),
      'typeof process': JSON.stringify('undefined'),
      'process': 'undefined',
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