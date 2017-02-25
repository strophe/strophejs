BOWER		?= node_modules/.bin/bower
GRUNT		?= ./node_modules/.bin/grunt
HTTPSERVE	?= ./node_modules/.bin/http-server
PHANTOMJS	?= ./node_modules/.bin/phantomjs
RJS         ?= ./node_modules/.bin/r.js
SHELL		?= /usr/env/bin/bash
SRC_DIR = src
DOC_DIR = doc
DOC_TEMP = doc-temp
NDPROJ_DIR = ndproj

STROPHE 	= strophe.js
STROPHE_MIN = strophe.min.js
STROPHE_LIGHT = strophe.light.js

.PHONY: help
help:
	@echo "Please use \`make <target>' where <target> is one of the following:"
	@echo ""
	@echo " release       Prepare a new release of strophe.js. E.g. `make release VERSION=1.2.13`"
	@echo " serve         Serve this directory via a webserver on port 8000."
	@echo " stamp-npm     Install NPM dependencies and create the guard file stamp-npm which will prevent those dependencies from being installed again."

all: doc $(STROPHE_MIN)

stamp-npm: package.json
	npm install
	touch stamp-npm

stamp-bower: stamp-npm bower.json
	$(BOWER) install
	touch stamp-bower

$(STROPHE_LIGHT):
	@@echo "Building" $(STROPHE_LIGHT) "..."
	$(GRUNT) concat:light
	@@echo

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
release: $(STROPHE) $(STROPHE_MIN)

strophe.min.js: src node_modules
	$(RJS) -o build.js
	sed -i s/@VERSION@/$(VERSION)/ strophe.js

strophe.js: src node_modules
	$(RJS) -o build.js optimize=none out=strophe.js
	sed -i s/@VERSION@/$(VERSION)/ strophe.js

.PHONY: check
check::
	make stamp-bower
	@@$(GRUNT) jshint
	$(PHANTOMJS) node_modules/qunit-phantomjs-runner/runner-list.js tests/strophe.html

.PHONY: serve
serve:
	$(HTTPSERVE) -p 8080

.PHONY: clean
clean:
	@@rm -f stamp-npm stamp-bower
	@@rm -rf node_modules bower_components
	@@rm -f $(STROPHE)
	@@rm -f $(STROPHE_MIN)
	@@rm -f $(STROPHE_LIGHT)
	@@rm -f $(PLUGIN_FILES_MIN)
	@@rm -rf $(NDPROJ_DIR) $(DOC_DIR) $(DOC_TEMP)
	@@echo "Done."
	@@echo
