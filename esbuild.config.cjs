// Documentation link:
// https://dev.to/slootjes/optimizing-typescript-packages-in-serverless-framework-with-esbuild-1ol4
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');

// inspired by https://github.com/evanw/esbuild/issues/1685
const excludeVendorFromSourceMap = (includes = []) => ({
  name: 'excludeVendorFromSourceMap',
  setup(build) {
    const emptySourceMap =
      // eslint-disable-next-line prefer-template
      '\n//# sourceMappingURL=data:application/json;base64,' +
      Buffer.from(
        JSON.stringify({
          version: 3,
          sources: [''],
          mappings: 'A',
        })
      ).toString('base64');

    // eslint-disable-next-line consistent-return
    build.onLoad({ filter: /node_modules/u }, async (args) => {
      if (
        /\.[mc]?js$/.test(args.path) &&
        !new RegExp(includes.join('|'), 'u').test(
          args.path.split(path.sep).join(path.posix.sep)
        )
      ) {
        return {
          contents: `${await fs.promises.readFile(args.path, 'utf8')}${emptySourceMap}`,
          loader: 'default',
        };
      }
    });
  },
});

module.exports = () => {
  return {
    format: 'esm',
    minify: true,
    sourcemap: true,
    sourcesContent: false,
    keepNames: false,
    outputFileExtension: '.mjs',
    plugins: [excludeVendorFromSourceMap(['@my-vendor', 'other/package'])],
    banner: {
      // https://github.com/evanw/esbuild/issues/1921
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
    mainFields: ['module', 'main'],
    treeShaking: true,
  };
};
