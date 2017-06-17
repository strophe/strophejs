# Release Checklist

1. Make sure all tests pass (run 'make check')
2. Update CHANGELOG.md
3. Run "make release VERSION=1.2.14" (on Mac, prefix with "SED=gsed" so that GNU-sed is used).
4. Add documentation to strophe.im repo
5. Update links in index.markdown in Strophe.im
6. Commit and push new documentation
7. Update link to documentation in README (of strophe.js)
8. Commit the newly generated files (mention it's a new release)
9. Tag code with version (git tag -s vVERSION )
10. Push repo and tags (git push && git push --tags)
11. Publish on NPM: "npm publish"
