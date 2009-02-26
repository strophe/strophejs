SRC_DIR = src

BASE_FILES = ${SRC_DIR}/b64.js \
	${SRC_DIR}/md5.js \
	${SRC_DIR}/sha1.js \
	${SRC_DIR}/strophe.js

STROPHE_VERSION = `cat version.txt`

STROPHE = strophe.js

all: ${STROPHE}

${STROPHE}: ${BASE_FILES}
	@@echo "Building " ${STROPHE} "..."
	@@cat ${BASE_FILES} > ${STROPHE}
	@@echo ${STROPHE} " built."
	@@echo

clean:
	@@echo "Cleaning " ${STROPHE} "..."
	@@rm -f ${STROPHE}
	@@echo ${STROPHE} " cleaned."
	@@echo
