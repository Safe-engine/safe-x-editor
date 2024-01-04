const reactMain = (componentRoot) => `
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import App from '${componentRoot}';

const store = createStore(()=>1, {});

ReactDOM.render(<Provider store={store}>
    <App />
  </Provider>
  , document.getElementById('preview'));
`;

const packTemplate = (entry, desDir, desFile) => `
const webpack = require('webpack');

webpack({
  // Configuration Object
  entry: '${entry}',
  output: {
    path: '${desDir}',
    filename: '${desFile}',
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: ['@babel/preset-react'],
          },
        },
      },
      {
        test: /\\.svg$/,
        use: [
          {
            loader: "babel-loader"
          },
          {
            loader: "react-svg-loader",
            options: {
              jsx: true // true outputs JSX tags
            }
          }
        ]
      },
      {
        test: /\\.s[ac]ss$/i,
        use: [
          // Creates style nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
    ],
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
}, (err, stats) => { // Stats Object

});
`;

module.exports = {
  reactMain,
  packTemplate,
};
