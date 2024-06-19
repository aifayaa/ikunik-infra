#!/usr/bin/env bash

ORIGIN_COMMIT="origin/dev"

usage() {
    echo "usage : ./eslintCheck.sh [--originCommit <ORIGIN_COMMIT>] [-- EXTRA...]"
    echo ""
    echo "    Launch eslint on modified files in $(js) directory between an origin commit and"
    echo "    the current working directory"
    echo ""
    echo "    Parameters:"
    echo ""
    echo "      -h --help : Display this help text"
    echo "      --originCommit : The source commit to compare to. Defaults to 'origin/dev'"
    echo ""
    echo "    Examples:"
    echo "      ./eslintCheck.sh"
    echo "      ./eslintCheck.sh --originCommit origin/dev"
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

# shift
EXTRA=$@

echo "ORIGIN_COMMIT=${ORIGIN_COMMIT}"
echo "EXTRA=${EXTRA}"
echo ""

modifiedFiles=$(for file in $(git diff ${ORIGIN_COMMIT} --name-only --diff-filter=ACMRT); do echo $file; done | grep -e "js$" | grep -v -e "^\." -e "package" -e "\.sh$")

for file in $modifiedFiles; do
    echo "INFO: Eslint check on ${file}"
    npx eslint ${file}
done
