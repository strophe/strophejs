CHROMIUM		?= ./node_modules/.bin/run-headless-chromium
DOC_DIR			= doc
DOC_TEMP		= doc-temp
HTTPSERVE		?= ./node_modules/.bin/http-server
HTTPSERVE_PORT  ?= 8080
ESLINT		  	?= ./node_modules/.bin/eslint
NDPROJ_DIR 		= ndproj
SED				?= sed
SHELL			?= /usr/env/bin/bash
SRC_DIR			= src
STROPHE			= dist/strophe.umd.js
NATURALDOCS		?= $(shell which naturaldocs)

all: doc $(STROPHE)

.PHONY: help
help:
	@echo "Please use \`make <target>' where <target> is one of the following:"
	@echo ""
	@echo " all         	Update docs + build strophe"
	@echo " doc         	Update docs"
	@echo " dist        	Build strophe"
	@echo " check       	Build and run the tests"
	@echo " eslint      	Check code quality"
	@echo " release     	Prepare a new release of strophe. E.g. \`make release VERSION=1.2.14\`"
	@echo " serve       	Serve this directory via a webserver on port 8000."
	@echo " node_modules   	Install all dependencies"
	@echo ""
	@echo "If you are a Mac user:\n  1. Install \`gnu-sed\` (brew install gnu-sed) \n  2. Set \`SED\` to \`gsed\` in all commands. E.g. \`make release SED=gsed VERSION=1.2.14\`"

node_modules: package.json
	npm install

.PHONY: doc
doc:
ifndef NATURALDOCS
	$(error "Naturaldocs not found: we won't be building the documentation")
endif
	@@echo "Building Strophe documentation..."
	@@if [ ! -d $(NDPROJ_DIR) ]; then mkdir $(NDPROJ_DIR); fi
	@@cp docs.css $(NDPROJ_DIR);
	@@if [ ! -d $(DOC_DIR) ]; then mkdir $(DOC_DIR); fi
	@@if [ ! -d $(DOC_TEMP) ]; then mkdir $(DOC_TEMP); fi
	@@cp $(STROPHE) $(DOC_TEMP)
	@@${NATURALDOCS} -r -ro -q -i $(DOC_TEMP) -o html $(DOC_DIR) -p $(NDPROJ_DIR) -s docs
	@@rm -r $(DOC_TEMP)
	@@echo "Documentation built."
	@@echo

.PHONY: release
release:
	$(SED) -i 's/\"version\":\ \"[0-9]\+\.[0-9]\+\.[0-9]\+\"/\"version\":\ \"$(VERSION)\"/' package.json
	$(SED) -i 's/VERSION:\ \"[0-9]\+\.[0-9]\+\.[0-9]\+\"/VERSION:\ \"$(VERSION)\"/' src/core.js
	$(SED)  -i "s/Unreleased/`date +%Y-%m-%d`/" CHANGELOG.md
	make dist
	make doc

.PHONY: watchjs
watchjs: node_modules
	./node_modules/.bin/npx  webpack --mode=development  --watch

.PHONY: dist
dist: $(STROPHE)

$(STROPHE): src rollup.config.js node_modules Makefile
	npm run build

.PHONY: eslint
eslint: node_modules
	$(ESLINT) src/

.PHONY: check
check:: node_modules eslint
	LOG_CR_VERBOSITY=INFO $(CHROMIUM) --no-sandbox http://localhost:$(HTTPSERVE_PORT)/tests/

.PHONY: serve
serve: node_modules
	$(HTTPSERVE) -p $(HTTPSERVE_PORT)

.PHONY: serve_bg
serve_bg: node_modules
	$(HTTPSERVE) -p $(HTTPSERVE_PORT) -c-1 -s &

.PHONY: clean
clean:
	@@rm -rf node_modules
	@@rm -f $(STROPHE)
	@@rm -f $(STROPHE_MIN)
	@@rm -f $(PLUGIN_FILES_MIN)
	@@rm -rf $(NDPROJ_DIR) $(DOC_DIR) $(DOC_TEMP)
	@@echo "Done."
	@@echo
