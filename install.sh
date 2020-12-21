#!/usr/bin/env bash

pkgDirs=$(find -mindepth 2 -maxdepth 2 -name package.json | cut -d'/' -f2)

for i in $pkgDirs; do
  src='../node_modules'
  dest="./$i/node_modules"

  if [ "$i" = 'node_modules' ]; then
    continue
  fi

  test -h "$dest" && rm -f "$dest"
  ln -s "$src" "$dest"
done
