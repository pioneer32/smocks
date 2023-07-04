const nodeExternals = require('webpack-node-externals');
const ShebangPlugin = require('webpack-shebang-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/cli.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cli.cjs',
    libraryTarget: 'this',
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, 'tsconfig.cli.json'),
          transpileOnly: true,
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  externalsPresets: { node: true },
  externals: [
    nodeExternals({
      additionalModuleDirs: [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, '../../node_modules')],
    }),
  ],
  plugins: [new ShebangPlugin()],
  optimization: {
    minimize: false,
  },
};
