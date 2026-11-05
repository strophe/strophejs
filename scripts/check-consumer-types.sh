#!/usr/bin/env bash
# Type-check the packed package the way a consumer would (strophe/strophejs#886).
# For each moduleResolution mode, a tiny project imports strophe.js and makes
# one deliberate type error. The check passes only if tsc reports exactly that
# error, which proves the published types resolve instead of degrading to `any`.
# Run `npm run build` first.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

tarball="$(cd "$root" && npm pack --silent --pack-destination "$work" | tail -n1)"
tsc="$(cd "$root" && node -p "require.resolve('typescript/bin/tsc')")"
# The published types must not need @types/node, so most probes run without
# it. One probe adds it to check the two still agree.
types_node="$(cd "$root" && node -p "require('path').dirname(require.resolve('@types/node/package.json'))")"
status=0

# check <name> <package type: module|commonjs> <module> <moduleResolution> <types: none|node> <source> <expected error>
check() {
    local name="$1" pkgtype="$2" module="$3" resolution="$4" types="$5" source="$6" expected="$7"
    local dir="$work/$name" types_json='[]'
    mkdir -p "$dir/node_modules/strophe.js"
    tar -xzf "$work/$tarball" -C "$dir/node_modules/strophe.js" --strip-components=1
    if [ "$types" = node ]; then
        mkdir -p "$dir/node_modules/@types"
        ln -s "$types_node" "$dir/node_modules/@types/node"
        types_json='["node"]'
    fi
    printf '{"type":"%s"}\n' "$pkgtype" > "$dir/package.json"
    printf '%s\n' "$source" > "$dir/index.ts"
    printf '{"compilerOptions":{"target":"es2022","module":"%s","moduleResolution":"%s","strict":true,"noEmit":true,"types":%s},"files":["index.ts"]}\n' \
        "$module" "$resolution" "$types_json" > "$dir/tsconfig.json"
    local out
    out="$(cd "$dir" && node "$tsc" -p . 2>&1 || true)"
    if [ "$(printf '%s\n' "$out" | grep -c 'error TS')" = 1 ] && printf '%s' "$out" | grep -qF "$expected"; then
        echo "ok   $name"
    else
        echo "FAIL $name"
        printf '%s\n' "$out" | sed 's/^/     /'
        status=1
    fi
}

shared="import { Strophe } from 'strophe.js';
const x: number = Strophe.NO_SUCH_PROPERTY;"
missing="Property 'NO_SUCH_PROPERTY' does not exist"

check nodenext module nodenext nodenext none "$shared" "$missing"
check node16 module node16 node16 none "$shared" "$missing"
check bundler module esnext bundler none "$shared" "$missing"
# The published types are ESM-only. CommonJS consumers are supported under
# nodenext, where TypeScript (5.8+) models Node's require(esm).
check nodenext-commonjs commonjs nodenext nodenext none "$shared" "$missing"

# Node consumers must get the Node entry's types, which add the component transport.
node_only="import { Component } from 'strophe.js';
const c: number = Component;"
check nodenext-node-entry module nodenext nodenext none "$node_only" "'typeof Component' is not assignable to type 'number'"
check nodenext-node-entry-types-node module nodenext nodenext node "$node_only" "'typeof Component' is not assignable to type 'number'"

exit $status
