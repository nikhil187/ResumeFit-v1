/* config-overrides.js */
const webpack = require('webpack');
const path = require('path');

module.exports = function override(config, env) {
    // Add fallbacks for node modules when used in browser
    config.resolve.fallback = {
        url: require.resolve('url'),
        assert: require.resolve('assert'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        buffer: require.resolve('buffer'),
        stream: require.resolve('stream-browserify'),
        process: require.resolve('process/browser'),
        vm: require.resolve('vm-browserify'),
    };
    
    // Add plugins to provide process and Buffer globals
    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
        // Ignore warnings for specific modules
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/,
        }),
    );

    // Add module load aliases to fix specific package issues
    config.resolve.alias = {
        ...config.resolve.alias,
        'process/browser': require.resolve('process/browser'),
    };
    
    // Suppress warnings from nested dependencies
    config.ignoreWarnings = [
        {
            // Ignore warnings about process module in jspdf's canvg
            message: /Can't resolve 'process\/browser'/,
        },
        {
            // Ignore VM module warnings
            message: /Can't resolve 'vm'/,
        }
    ];

    return config;
} 