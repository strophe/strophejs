var fs   = require('fs');
var exec = require('child_process').exec;
var pkg  = require('./package.json');

var SRC_DIR    = "src";
var DOC_DIR    = "doc";
var PLUGIN_DIR = "plugins";
var NDPROJ_DIR = "ndproj";

var getNDCmd = function(cmd){
  var exec = '';
  if (cmd) {
    exec = cmd;
  } else {
    exec = "NaturalDocs";
  }
  return exec += " -q -i " + SRC_DIR + " -i " + PLUGIN_DIR + " -o html " + DOC_DIR + " -p " + NDPROJ_DIR;
};

var BASE_FILES = [
  SRC_DIR + '/base64.js',
  SRC_DIR + '/sha1.js',
  SRC_DIR + '/md5.js',
  SRC_DIR + '/core.js',
  SRC_DIR + '/bosh.js',
  SRC_DIR + '/websocket.js'
];

module.exports = function(grunt){

  grunt.initConfig({

    concat: {
      dist: {
        files: {
          "strophe.js": BASE_FILES
        },
        options: {
          process: function(src){
            return src.replace('@VERSION@', pkg.version);
          }
        }
      }
    },

    uglify: {
      dist: {
        files: {
          'strophe.min.js': ["dist/strophe.js"]
        }
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-uglify");

  grunt.registerTask('doc', 'Create docs', function() {
    var done = this.async();
    if(!fs.existsSync(NDPROJ_DIR)) fs.mkdirSync(NDPROJ_DIR);
    if(!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR);
    exec(getNDCmd(), function(err){
      if (err.code === 127){
        // try different command
        console.log(getNDCmd("naturaldocs"));
        exec(getNDCmd("naturaldocs"),done);
      }
      else { done(err); }
    });
  });

  grunt.registerTask("default", ["concat", "uglify"]);

};
