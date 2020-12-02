# Release Checklist

## Note: it's assumed that you have Strophe.js and Strophe.im checked out in sibling directories.

1. Make sure all tests pass (run 'make check')
2. Update CHANGELOG.md
3. Run `make release VERSION=1.4.2` (on Mac, prefix with "SED=gsed" so that GNU-sed is used).
4. Run `make doc`
5. Run `cp -r doc ../strophe.im/strophejs/doc/1.4.2`
5. Update links in `../strophe.im/strophejs/index.markdown` in Strophe.im
6. `git commit -am "Docs for Strophe.js 1.4.2" && git push`
7. Update link to documentation in README (of strophe.js)
8. `cd ../strophe.js && git commit -am "Release 1.4.2"`
9. `git tag -s v1.4.2 -m "Release 1.4.2"`
10. Run `git push && git push origin v1.4.2`
11. Publish on NPM: `npm publish`
12. Update the release notes on https://github.com/strophe/strophejs/releases
13. Run `npm pack` and upload the tgz file to the releases page.
