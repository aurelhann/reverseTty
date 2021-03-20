/* eslint-disable no-console */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import progress from 'rollup-plugin-progress';
import rollupPluginNode from 'rollup-plugin-node';

import path from 'path';

export default [
    {
        input: './src/server/index.mjs',
        output: {
            file: path.join(process.cwd(), '.bin', 'reverseTtyServer.mjs'),
            format: 'esm',
            banner: '#! /bin/sh\n' +
                '":" //# comment; exec /usr/bin/env node --experimental-modules --no-warnings --harmony "$0" "$@"'
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
