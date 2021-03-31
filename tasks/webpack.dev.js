const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const WriteFilePlugin = require('write-file-webpack-plugin');

module.exports = merge(common, { 
  output: {
    path: `${__dirname}/../../origo/plugins`,
    publicPath: '/build/js',
    filename: 'legendenhancer.js',
    libraryTarget: 'var',
    libraryExport: 'default',
    library: 'Legendenhancer'
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: "style-loader"
          },            
          {
            loader: "css-loader"
          },          
          {
            loader: "sass-loader"     
          }
        ]
      }      
    ]
  },
  plugins: [
    new WriteFilePlugin()
  ],  
  devServer: {
    contentBase: './',
    port: 9008
  }
});
