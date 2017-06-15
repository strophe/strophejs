BOWER		?= node_modules/.bin/bower
HTTPSERVE	?= ./node_modules/.bin/http-server
JSHINT		?= ./node_modules/.bin/jshint
PHANTOMJS	?= ./node_modules/.bin/phantomjs
RJS			?= ./node_modules/.bin/r.js
SHELL		?= /usr/env/bin/bash
SRC_DIR		= src
DOC_DIR		= doc
DOC_TEMP	= doc-temp
NDPROJ_DIR 	= ndproj
SED			?= sed

STROPHE			= strophe.js
STROPHE_MIN		= strophe.min.js
STROPHE_LIGHT	= strophe-no-polyfill.js

all: doc $(STROPHE) $(STROPHE_MIN)

.PHONY: help
help:
	@echo "Please use \`make <target>' where <target> is one of the following:"
	@echo ""
	@echo " release       Prepare a new release of strophe.js. E.g. `make release VERSION=1.2.14`"
	@echo " serve         Serve this directory via a webserver on port 8000."
	@echo " stamp-npm     Install NPM dependencies and create the guard file stamp-npm which will prevent those dependencies from being installed again."

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

.PHONE: dist
dist: $(STROPHE) $(STROPHE_MIN) $(STROPHE_LIGHT)

$(STROPHE_MIN): src node_modules Makefile
	$(RJS) -o build.js insertRequire=strophe-polyfill include=strophe-polyfill out=$(STROPHE_MIN)
	$(SED) -i s/@VERSION@/$(VERSION)/ $(STROPHE_MIN)

$(STROPHE): src node_modules Makefile
	$(RJS) -o build.js optimize=none insertRequire=strophe-polyfill include=strophe-polyfill out=$(STROPHE)
	$(SED) -i s/@VERSION@/$(VERSION)/ $(STROPHE)

$(STROPHE_LIGHT): src node_modules Makefile
	$(RJS) -o build.js optimize=none out=$(STROPHE_LIGHT)
	$(SED) -i s/@VERSION@/$(VERSION)/ $(STROPHE_LIGHT)

.PHONY: jshint
jshint: stamp-npm
	$(JSHINT) --config jshintrc src/*.js

.PHONY: check
check:: stamp-npm jshint
	$(PHANTOMJS) node_modules/qunit-phantomjs-runner/runner-list.js tests/index.html

.PHONY: serve
serve:
	$(HTTPSERVE) -p 8080

.PHONY: clean
clean:
	@@rm -f stamp-npm
	@@rm -rf node_modules
	@@rm -f $(STROPHE)
	@@rm -f $(STROPHE_MIN)
	@@rm -f $(STROPHE_LIGHT)
	@@rm -f $(PLUGIN_FILES_MIN)
	@@rm -rf $(NDPROJ_DIR) $(DOC_DIR) $(DOC_TEMP)
	@@echo "Done."
	@@echo
