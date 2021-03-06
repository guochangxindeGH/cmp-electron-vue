'use strict'

process.env.BABEL_ENV = 'renderer'

const path = require('path')
const { dependencies } = require('../package.json')
const webpack = require('webpack')

const BabiliWebpackPlugin = require('babili-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')

/**
 * List of node_modules to include in webpack bundle
 *
 * Required for specific packages like Vue UI libraries
 * that provide pure *.vue files that need compiling
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/webpack-configurations.html#white-listing-externals
 */

//渲染进程的主配置文件的主要内容：
//将vue模块列为白名单
let whiteListedModules = ['vue']

let rendererConfig = {
    //指定sourcemap方式
    devtool: '#cheap-module-eval-source-map',
    entry: {
        renderer: path.join(__dirname, '../src/renderer/main.js'),
        packageEntry: path.join(__dirname, '../src/packageProcessor/packageProcessor.js')
    },
    externals: [
        //编译白名单
        ...Object.keys(dependencies || {}).filter(d => !whiteListedModules.includes(d))
    ],
  module: {
    rules: [
        {
            test: /\.scss$/,
            use: ['vue-style-loader', 'css-loader', 'sass-loader']
        },
        {
            test: /\.sass$/,
            use: ['vue-style-loader', 'css-loader', 'sass-loader?indentedSyntax']
        },
        {
            test: /\.less$/,
            use: ['vue-style-loader', 'css-loader',
                {
                    loader: 'less-loader',
                    options: {
                        sourceMap: true,
                        javascriptEnabled: true
                    }
                }, {
                    loader: 'sass-resources-loader',
                    options: {
                        resources: [
                            // 将全局的less样式注入到每个页面中
                            path.resolve(__dirname, '../src/renderer/style/global.less')
                        ]
                    }
                }]
        },
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader']
      },
      {
        test: /\.html$/,
        use: 'vue-html-loader'
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      },
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader',
          options: {
            extractCSS: process.env.NODE_ENV === 'production',
            loaders: {
              sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax=1',
              scss: 'vue-style-loader!css-loader!sass-loader',
              less: 'vue-style-loader!css-loader!less-loader'
            }
          }
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: {
            limit: 10000,
            name: 'imgs/[name]--[folder].[ext]'
          }
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'media/[name]--[folder].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: {
            limit: 10000,
            name: 'fonts/[name]--[folder].[ext]'
          }
        }
      }
    ]
  },
  node: {
      //根据版本信息确定__dirname和__filename的行为
      __dirname: process.env.NODE_ENV !== 'production',
      __filename: process.env.NODE_ENV !== 'production'
  },
  plugins: [
    new VueLoaderPlugin(),
      //css文件分离
      new MiniCssExtractPlugin({filename: 'styles.css'}),
      //自动生成html首页
      new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(__dirname, '../src/index.ejs'),
          chunks: ['renderer'],
          minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true
      },
      nodeModules: process.env.NODE_ENV !== 'production'
        ? path.resolve(__dirname, '../node_modules')
        : false
      }),
      new HtmlWebpackPlugin({
          filename: 'packageEntry.html',
          template: path.resolve(__dirname, '../src/index.ejs'),
          chunks: ['packageEntry'],
          minify: {
              collapseWhitespace: true,
              removeAttributeQuotes: true,
              removeComments: true
          },
          nodeModules: process.env.NODE_ENV !== 'production'
              ? path.resolve(__dirname, '../node_modules')
              : false
      }),
      //热更新模块
      new webpack.HotModuleReplacementPlugin(),
      //在编译出现错误时，使用 NoEmitOnErrorsPlugin 来跳过输出阶段
      new webpack.NoEmitOnErrorsPlugin()
  ],
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '../dist/electron')
  },
  resolve: {
    alias: {
        //在代码中使用@代表renderer目录
        '@': path.join(__dirname, '../src/renderer'),
        //精确指定vue特指vue.esm.js文件
        'vue$': 'vue/dist/vue.esm.js',
        'dirSrc': path.join(__dirname, '../src'),
        'dirRes': path.join(__dirname, '../src/renderer/res'),
        'dirRenderer': path.join(__dirname, '../src/renderer'),
        'dirUtil': path.join(__dirname, '../src/util'),
        'dirManagers': path.join(__dirname, '../src/renderer/managers'),
        'dirScreens': path.join(__dirname, '../src/renderer/components'),
    },
    extensions: ['.js', '.vue', '.json', '.css', '.node', '.less']
  },
    //指定编译为 Electron 渲染进程
    target: 'electron-renderer'
}

/**
 * Adjust rendererConfig for development settings
 */
if (process.env.NODE_ENV !== 'production') {
  rendererConfig.plugins.push(
    new webpack.DefinePlugin({
      '__static': `"${path.join(__dirname, '../static').replace(/\\/g, '\\\\')}"`
    })
  )
}

/**
 * Adjust rendererConfig for production settings
 */
if (process.env.NODE_ENV === 'production') {
  rendererConfig.devtool = ''

  rendererConfig.plugins.push(
    new BabiliWebpackPlugin(),
    new CopyWebpackPlugin([
      {
        from: path.join(__dirname, '../static'),
        to: path.join(__dirname, '../dist/electron/static'),
        ignore: ['.*']
      }
    ]),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  )
}

module.exports = rendererConfig
