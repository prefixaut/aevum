const path = require('path');

module.exports = {
    entry: './src/aevum.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        library: 'aevum',
        libraryTarget: 'umd',
        filename: 'aevum.js',
        path: path.resolve(__dirname)
    }
};