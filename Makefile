SHELL		?= /usr/env/bin/bash
BOWER		?= node_modules/.bin/bower
GRUNT		?= ./node_modules/.bin/grunt
HTTPSERVE	?= ./node_modules/.bin/http-server
PHANTOMJS	?= ./node_modules/.bin/phantomjs
SRC_DIR = src
DOC_DIR = doc
DOC_TEMP = doc-temp
NDPROJ_DIR = ndproj

STROPHE 	= strophe.js
STROPHE_MIN = strophe.min.js

all: $(STROPHE_MIN)

stamp-npm: package.json
	npm install
	touch stamp-npm

stamp-bower: stamp-npm bower.json
	$(BOWER) install
	touch stamp-bower

$(STROPHE)::
	make stamp-bower
	@@echo "Building" $(STROPHE) "..."
	$(GRUNT) concat
	@@echo

$(STROPHE_MIN)::
	make $(STROPHE)
	@@echo "Building" $(STROPHE_MIN) "..."
	$(GRUNT) min

.PHONY: doc
doc:
	@@echo "Building Strophe documentation..."
	@@if [ ! -d $(NDPROJ_DIR) ]; then mkdir $(NDPROJ_DIR); fi
	@@if [ ! -d $(DOC_DIR) ]; then mkdir $(DOC_DIR); fi
	@@if [ ! -d $(DOC_TEMP) ]; then mkdir $(DOC_TEMP); fi
	@@cp $(STROPHE) $(DOC_TEMP)
	@@naturaldocs -r -ro -q -i $(DOC_TEMP) -o html $(DOC_DIR) -p $(NDPROJ_DIR)
	@@echo "Documentation built."
	@@echo

.PHONY: release
release:
	@@$(GRUNT) release
	@@echo "Release created."
	@@echo

.PHONY: check
check::
	make stamp-bower
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
	@@rm -f $(PLUGIN_FILES_MIN)
	@@rm -rf $(NDPROJ_DIR) $(DOC_DIR) $(DOC_TEMP)
	@@echo "Done."
	@@echo
