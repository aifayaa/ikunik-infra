#!/usr/bin/env bash

pkgDirs=$(find . -mindepth 2 -maxdepth 2 -name package.json | cut -d'/' -f2)

for i in $pkgDirs; do
  src='../node_modules'
  dest="./$i/node_modules"

  test "$i" = 'node_modules' && continue
  test -d "$dest" && continue
  test -h "$dest" && rm -f "$dest"

  ln -s "$src" "$dest"
done
