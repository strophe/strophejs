# Release Checklist

1. Make sure all tests pass (run 'make check')
2. Update CHANGELOG.md
3. Run `make release VERSION=1.3.5` (on Mac, prefix with "SED=gsed" so that GNU-sed is used).
4. Run `make doc`
5. Run `cp -r doc ../strophe.im/strophejs/doc/1.3.5`
5. Update links in `strophejs/index.markdown` in Strophe.im
6. Commit and push new documentation
7. Update link to documentation in README (of strophe.js)
8. Commit the newly generated files (mention it's a new release)
9. Tag code with version (git tag -s vVERSION )
10. Push repo and tags (git push && git push --tags)
11. Publish on NPM: "npm publish"
12. Update the release notes on https://github.com/strophe/strophejs/releases
13. Run `npm pack` and upload the tgz file to the releases page.
