const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  output: {
    path: `${__dirname}/../build/js`,
    publicPath: '/build/js',
    filename: 'enhl.js',
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
  devServer: {
    contentBase: './',
    port: 9008
  }
});
