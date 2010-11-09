SHELL=/bin/bash

SRC_DIR = src
DOC_DIR = doc
PLUGIN_DIR = plugins
NDPROJ_DIR = ndproj

BASE_FILES = $(SRC_DIR)/base64.js \
	$(SRC_DIR)/md5.js \
	$(SRC_DIR)/core.js

STROPHE = strophe.js
STROPHE_MIN = strophe.min.js

PLUGIN_FILES = $(shell ls $(PLUGIN_DIR)/strophe.*.js | grep -v min)
PLUGIN_FILES_MIN = $(PLUGIN_FILES:.js=.min.js)

DIST_FILES = LICENSE.txt README.txt contrib examples plugins tests doc \
		$(STROPHE) $(STROPHE_MIN)

VERSION = $(shell if [ -f version.txt ]; then cat version.txt; else VERSION=`git rev-list HEAD -n1`; echo $${VERSION:0:7}; fi)

all: normal min

normal: $(STROPHE)

min: $(STROPHE_MIN) $(PLUGIN_FILES_MIN)

$(STROPHE): $(BASE_FILES)
	@@echo "Building" $(STROPHE) "..."
	@@cat $(BASE_FILES) | sed -e 's/@VERSION@/$(VERSION)/' > $(STROPHE)
	@@echo $(STROPHE) "built."
	@@echo

$(STROPHE_MIN): $(STROPHE)
	@@echo "Building" $(STROPHE_MIN) "..."
ifdef YUI_COMPRESSOR
	@@java -jar $(YUI_COMPRESSOR) --type js --nomunge \
		$(STROPHE) > $(STROPHE_MIN)
	@@echo $(STROPHE_MIN) "built."
else
	@@echo $(STROPHE_MIN) "not built."
	@@echo "    YUI Compressor required to build minified version."
	@@echo "    Please set YUI_COMPRESSOR to the path to the jar file."
endif
	@@echo

%.min.js: %.js
	@@echo "Building" $@ "..."
ifdef YUI_COMPRESSOR
	@@java -jar $(YUI_COMPRESSOR) --type js --nomunge \
		$< > $@
	@@echo $@ "built."
else
	@@echo $@ "not built."
	@@echo "    YUI Compressor required to build minified version."
	@@echo "    Please set YUI_COMPRESSOR to the path to the jar file."
endif
	@@echo

doc:
	@@echo "Building Strophe documentation..."
	@@if [ ! -d $(NDPROJ_DIR) ]; then mkdir $(NDPROJ_DIR); fi
	@@if [ ! -d $(DOC_DIR) ]; then mkdir $(DOC_DIR); fi
	@@NaturalDocs -q -i $(SRC_DIR) -i $(PLUGINS_DIR) -o html $(DOC_DIR) -p $(NDPROJ_DIR)
	@@echo "Documentation built."
	@@echo

release: normal min doc
	@@echo "Creating release packages..."
	@@mkdir strophejs-$(VERSION)
	@@cp -R $(DIST_FILES) strophejs-$(VERSION)
	@@tar czf strophejs-$(VERSION).tar.gz strophejs-$(VERSION)
	@@zip -qr strophejs-$(VERSION).zip strophejs-$(VERSION)
	@@rm -rf strophejs-$(VERSION)
	@@echo "Release created."
	@@echo

clean:
	@@echo "Cleaning" $(STROPHE) "..."
	@@rm -f $(STROPHE)
	@@echo $(STROPHE) "cleaned."
	@@echo "Cleaning" $(STROPHE_MIN) "..."
	@@rm -f $(STROPHE_MIN)
	@@echo $(STROPHE_MIN) "cleaned."
	@@echo "Cleaning minified plugins..."
	@@rm -f $(PLUGIN_FILES_MIN)
	@@echo "Minified plugins cleaned."
	@@echo "Cleaning documentation..."
	@@rm -rf $(NDPROJ_DIR) $(DOC_DIR)
	@@echo "Documentation cleaned."
	@@echo

.PHONY: all normal min doc release clean
