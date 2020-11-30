/* eslint-disable no-console */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import progress from 'rollup-plugin-progress';
import rollupPluginNode from 'rollup-plugin-node';

import path from 'path';

export default [
    {
        input: './src/index.mjs',
        output: {
            file: path.join(process.cwd(), '.bin', 'iotAuthenticator.js'),
            format: 'es',
        },
        plugins: [
            progress(),
            resolve({
                preferBuiltins: true
            }),
            json(),
            commonjs(),
            rollupPluginNode()
        ],
    }
];
