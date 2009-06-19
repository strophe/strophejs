SRC_DIR = src

BASE_FILES = $(SRC_DIR)/b64.js \
	$(SRC_DIR)/md5.js \
	$(SRC_DIR)/sha1.js \
	$(SRC_DIR)/strophe.js

STROPHE_VERSION = `cat version.txt`

STROPHE = strophe.js
STROPHE_MIN = strophe.min.js

.PHONY: all normal min clean

all: normal min

normal: $(STROPHE)

min: $(STROPHE_MIN)

$(STROPHE): $(BASE_FILES)
	@@echo "Building " $(STROPHE) "..."
	@@cat $(BASE_FILES) > $(STROPHE)
	@@echo $(STROPHE) " built."
	@@echo

$(STROPHE_MIN): $(STROPHE)
	@@echo "Building " $(STROPHE_MIN) "..."
ifdef YUI_COMPRESSOR
	@@java -jar $(YUI_COMPRESSOR) --type js --nomunge \
		$(STROPHE) > $(STROPHE_MIN)
	@@echo $(STROPHE_MIN) " built."
else
	@@echo $(STROPHE_MIN) " not built."
	@@echo "    YUI Compressor required to build minified version."
	@@echo "    Please set YUI_COMPRESSOR to the path to the jar file."
endif
	@@echo

clean:
	@@echo "Cleaning " $(STROPHE) "..."
	@@rm -f $(STROPHE)
	@@echo $(STROPHE) " cleaned."
	@@echo "Cleaning " $(STROPHE_MIN) "..."
	@@rm -f $(STROPHE_MIN)
	@@echo $(STROPHE_MIN) " cleaned."
	@@echo
