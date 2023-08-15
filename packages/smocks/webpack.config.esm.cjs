const nodeExternals = require('webpack-node-externals');
const ShebangPlugin = require('webpack-shebang-plugin');
const path = require('path');

module.exports = {
  experiments: {
    outputModule: true,
  },
  mode: 'production',
  entry: path.resolve(__dirname, 'src/index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist', 'esm'),
    filename: 'index.js',
    library: {
      type: 'module',
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, 'tsconfig.esm.json'),
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
      allowlist: [/^@pioneer32\//],
    }),
  ],
  plugins: [new ShebangPlugin()],
  optimization: {
    minimize: false,
  },
};
