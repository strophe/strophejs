# Release Checklist

- Make sure all tests pass (run 'make check')
- Decide on version number
- Update CHANGELOG.md
- Check for correct version number in package.json and bower,json
- Run "make release"
- Commit the newly generated files (mention it's a new release)
- Tag code with version (git tag -s vVERSION )
- Push repo and tags (git push && git push --tags)
- Publish on NPM: "npm publish"
- Add documentation to strophe.im repo
- Update links in index.html in Strophe.im
- Update link to documentation in README
- Tell the world
