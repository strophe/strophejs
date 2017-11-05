HTTPSERVE	?= ./node_modules/.bin/http-server
JSHINT		?= ./node_modules/.bin/jshint
PHANTOMJS	?= ./node_modules/.bin/phantomjs
BRSFY		?= ./node_modules/.bin/browserify
UGLIFY		?= ./node_modules/.bin/uglifyjs
SHELL		?= /usr/env/bin/bash
SRC_DIR		= src
DOC_DIR		= doc
DOC_TEMP	= doc-temp
NDPROJ_DIR 	= ndproj
SED			?= sed

STROPHE			= strophe.browserify.js
STROPHE_LIGHT	= strophe-no-polyfill.browserify.js

.PHONY: help
help:
	@echo "Please use \`make <target>' where <target> is one of the following:"
	@echo ""
	@echo " doc         Update docs"
	@echo " jshint      Check the code quality"
	@echo " check       Build and run the tests"
	@echo " jshint      Check code quality"
	@echo " release     Prepare a new release of $(STROPHE). E.g. \`make release VERSION=1.2.14\`"
	@echo " serve       Serve this directory via a webserver on port 8000."
	@echo ""
	@echo "If you are a Mac user:\n  1. Install \`gnu-sed\` (brew install gnu-sed) \n  2. Set \`SED\` to \`gsed\` in all commands. E.g. \`make release SED=gsed VERSION=1.2.14\`"

stamp-npm: package.json
	npm install
	touch stamp-npm

.PHONY: doc
doc:
	@@echo "Building Strophe documentation..."
	@@if [ ! -d $(NDPROJ_DIR) ]; then mkdir $(NDPROJ_DIR); fi
	@@cp docs.css $(NDPROJ_DIR);
	@@if [ ! -d $(DOC_DIR) ]; then mkdir $(DOC_DIR); fi
	@@if [ ! -d $(DOC_TEMP) ]; then mkdir $(DOC_TEMP); fi
	@@cp $(STROPHE) $(DOC_TEMP)
	@@naturaldocs -r -ro -q -i $(DOC_TEMP) -o html $(DOC_DIR) -p $(NDPROJ_DIR) -s docs
	@@rm -r $(DOC_TEMP)
	@@echo "Documentation built."
	@@echo

.PHONY: release
release:
	$(SED) -i 's/\"version\":\ \"[0-9]\+\.[0-9]\+\.[0-9]\+\"/\"version\":\ \"$(VERSION)\"/' package.json
	$(SED)  -i "s/Unreleased/`date +%Y-%m-%d`/" CHANGELOG.md
	make dist
	make doc

.PHONY: jshint
jshint: stamp-npm
	$(JSHINT) --config jshintrc src/*.js

.PHONY: check
check: stamp-npm jshint
	$(BRSFY) tests/src/main.js -o tests/main.js
	$(PHANTOMJS) node_modules/qunit-phantomjs-runner/runner-list.js tests/index.html

.PHONY: serve
serve:
	$(HTTPSERVE) -p 8080

.PHONY: clean
clean:
	@@rm -f stamp-npm
	@@rm -rf node_modules
	@@rm -f $(STROPHE)
	@@rm -f $(STROPHE_LIGHT)
	@@rm -f $(PLUGIN_FILES_MIN)
	@@rm -rf $(NDPROJ_DIR) $(DOC_DIR) $(DOC_TEMP)
	@@echo "Done."
	@@echo
