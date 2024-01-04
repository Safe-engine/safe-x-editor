const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { dependencies: externals } = require('./package.json');

const PathsPlugin = new TsconfigPathsPlugin({
  configFile: path.join(__dirname, './main/tsconfig.json')
});

module.exports = {
  entry: './main/index.ts',
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'build/main'),
    libraryTarget: 'commonjs2',
  },
  target: 'electron-main',
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: [
    ...Object.keys(externals || {}),
  ],
  plugins: [
    // CopyPlugin,
  ],
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.ts$/,
        include: /main/,
        use: [{ loader: 'ts-loader' }]
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    plugins: [
      PathsPlugin,
    ]
  },
  mode: 'production',
};
