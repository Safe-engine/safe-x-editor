const path = require('path')
const createElectronReloadWebpackPlugin = require('webpack-electron-reload')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const { dependencies: externals } = require('./package.json')

const ElectronReloadWebpackPlugin = createElectronReloadWebpackPlugin({
  // Path to `package.json` file with main field set to main process file path, or just main process file path
  path: path.join(__dirname, 'build/main/index.js'),
  // or just `path: './'`,
  // Other 'electron-connect' options
  logLevel: 0,
})

const PathsPlugin = new TsconfigPathsPlugin({
  configFile: path.join(__dirname, './main/tsconfig.json'),
})

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
  externals: [...Object.keys(externals || {})],
  plugins: [
    // CopyPlugin,
    // Call created plugin here
    ElectronReloadWebpackPlugin(),
    // If your config `target` is different from recommended one then you should also specify it like this `ElectronReloadWebpackPlugin('electron-renderer')`
  ],
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.ts$/,
        include: /main/,
        use: [{ loader: 'ts-loader' }],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    plugins: [PathsPlugin],
    alias: {
      'handlebars': 'handlebars/dist/handlebars.js'
    },
  },
  mode: 'development',
}
