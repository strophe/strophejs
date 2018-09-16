BOWER			?= node_modules/.bin/bower
CHROMIUM		?= ./node_modules/.bin/run-headless-chromium
DOC_DIR			= doc
DOC_TEMP		= doc-temp
HTTPSERVE		?= ./node_modules/.bin/http-server
HTTPSERVE_PORT  ?= 8080
JSHINT			?= ./node_modules/.bin/jshint
NDPROJ_DIR 		= ndproj
RJS				?= ./node_modules/.bin/r.js
SED				?= sed
SHELL			?= /usr/env/bin/bash
SRC_DIR			= src

STROPHE			= strophe.js
STROPHE_MIN		= strophe.min.js
STROPHE_LIGHT	= strophe-no-polyfill.js

all: doc $(STROPHE) $(STROPHE_MIN)

.PHONY: help
help:
	@echo "Please use \`make <target>' where <target> is one of the following:"
	@echo ""
	@echo " all         Update docs + build $(STROPHE) and $(STROPHE_MIN)"
	@echo " doc         Update docs"
	@echo " dist        Build $(STROPHE), $(STROPHE_MIN) and $(STROPHE_LIGHT)"
	@echo " check       Build and run the tests"
	@echo " jshint      Check code quality"
	@echo " release     Prepare a new release of $(STROPHE). E.g. \`make release VERSION=1.2.14\`"
	@echo " serve       Serve this directory via a webserver on port 8000."
	@echo " stamp-npm   Install NPM dependencies and create the guard file stamp-npm which will prevent those dependencies from being installed again."
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

.PHONY: dist
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
	LOG_CR_VERBOSITY=INFO $(CHROMIUM) --no-sandbox http://localhost:$(HTTPSERVE_PORT)/tests/

.PHONY: serve
serve: stamp-npm
	$(HTTPSERVE) -p $(HTTPSERVE_PORT)

.PHONY: serve_bg
serve_bg: stamp-npm
	$(HTTPSERVE) -p $(HTTPSERVE_PORT) -c-1 -s &

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
