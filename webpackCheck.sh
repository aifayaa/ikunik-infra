#!/bin/bash

ORIGIN_COMMIT="origin/dev"

usage() {
  echo "usage : ./webpackCheck.sh [PARAMS...] [-- EXTRA...]"
  echo ""
  echo "    Launch webpack compilation of modified modules between an origin commit and"
  echo "    the current working directory"
  echo ""
  echo "    Parameters:"
  echo ""
  echo "      -h --help : Display this help text"
  echo "      --originCommit : The source commit to compare to. Defaults to 'origin/dev'"
  echo ""
  echo "    Examples:"
  echo "      ./webpackCheck.sh"
  echo "      ./webpackCheck.sh --originCommit origin/dev"
  echo ""
}

while [ "$1" != '' ] && [ "$1" != '--' ]; do
  PARAM=$1
  VALUE=$2
  case $PARAM in
  -h | --help)
    usage
    exit
    ;;
  --originCommit)
    ORIGIN_COMMIT=$VALUE
    ;;
  *)
    echo "ERROR: unknown parameter \"$PARAM\""
    usage
    exit 1
    ;;
  esac
  shift
  shift
done

shift
EXTRA=$@

echo "ORIGIN_COMMIT=${ORIGIN_COMMIT}"
echo ""

# Independance current directory position to call the script
rootDir=$(dirname $(readlink -f $0))
cd ${rootDir}

outDir=${rootDir}/tmp/webpackCheck
echo "Output directory: ${outDir}"

# Reset output directory
rm -rf $outDir ; mkdir -p $outDir

# Retrieve the list of modules to check
modulesToCheck=$(for file in $(git diff ${ORIGIN_COMMIT} --name-only --diff-filter=ACMRT) ; do dirname $file ; done | cut -d"/" -f1 | uniq | grep -v "\.")

echo "Modules to check: [${modulesToCheck}]"

FAILED_MODULES=""
res=0
# Do a webpack compilation in each module
for module in ${modulesToCheck}; do
    echo "Running webpack for module: ${module} ..."
    echo "Module: ${module}"
    cd ${module} && npx sls webpack -o ${outDir}/webpack > ${outDir}/webpackOuput.log
    if [ $? -ne 0 ] ; then
      echo "ERROR: Webpack compilation failed in '${module}'"
      FAILED_MODULES="${FAILED_MODULES} ${module}"
      res=1
    fi
    cd ..
done

if [ $res -eq 1 ] ; then
  echo "ERROR: compilation failure in"
  for module in ${FAILDES_MODULES} ; do 
    echo "  - ${module}"
  done
  false
fi

