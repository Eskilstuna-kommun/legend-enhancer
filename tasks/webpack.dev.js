const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

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
  devServer: {
    static: './',
    port: 9008,
    devMiddleware: {
      //index: true,
      //mimeTypes: { 'text/html': ['phtml'] },
      //publicPath: '/publicPathForDevServe',
      //serverSideRender: true,
      writeToDisk: true
    },
  }
});
