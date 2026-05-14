const moduleName = (process.env.npm_package_name || '').split('/').at(-1);

let configuration = {
  sourcemap: true,
};

// Particularity of the 'files' module: exclude 'sharp' from the bundle
if (moduleName === 'files') {
  configuration = {
    ...configuration,
    external: ['sharp'],
    installExtraArgs: [
      '--ignore-scripts=false',
      '--foreground-scripts',
      '--platform=linux',
      '--arch=x64',
    ],
    packagerOptions: {
      scripts: [
        'npm rebuild sharp --ignore-scripts=false --foreground-scripts --platform=linux --arch=x64',
      ],
    },
  };
}

module.exports = () => {
  return configuration;
};
