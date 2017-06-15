# Release Checklist

1. Make sure all tests pass (run 'make check')
2. Update CHANGELOG.md
3. Run "make release VERSION=1.2.14" (on Mac, prefix with "SED=gsed" so that
   GNU-sed is used).
4. Commit the newly generated files (mention it's a new release)
5. Tag code with version (git tag -s vVERSION )
6. Push repo and tags (git push && git push --tags)
7. Publish on NPM: "npm publish"
8. Add documentation to strophe.im repo
9. Update links in index.markdown in Strophe.im
10. Update link to documentation in README
