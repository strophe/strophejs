// Check for the name of the naturaldocs binary
var fs = require('fs');
if (fs.existsSync("/usr/bin/naturaldocs")) {
    naturaldocs = "/usr/bin/naturaldocs";
} else if (fs.existsSync("/usr/lib/bin/natural_docs")) {
    naturaldocs = "/usr/lib/bin/natural_docs";
} else {
    naturaldocs = "naturaldocs";
}

module.exports = function(grunt){
    var pkg = grunt.file.readJSON('package.json');

    grunt.initConfig({
        pkg: pkg,

        clean: {
            "prepare-doc": ["<%= natural_docs.docs.inputs[0] %>", "<%= natural_docs.docs.project %>"],
            "doc": ["<%= natural_docs.docs.output %>"],
            "prepare-release": ["strophejs-<%= pkg.version %>"],
            "release": ["strophejs-<%= pkg.version %>.zip", "strophejs-<%= pkg.version %>.tar.gz"],
            "js": ["<%= concat.dist.dest %>", "strophe.min.js", "strophe.light.js"]
        },

        connect: {
            server: {
                options: {
                    port: 8000,
                    base: '.'
                }
            }
        },

        concat: {
            dist: {
                src: ['src/base64.js', 'src/sha1.js', 'src/md5.js', 'src/utils.js', 'src/polyfills.js', 'src/core.js', 'src/bosh.js', 'src/websocket.js'],
                dest: '<%= pkg.name %>'
            },
            light: {
                // This rule is meant to build a lighter version without Base64 nor Polyfills,
                // by explicitly running `make strophe.light.js` -- The generated file will
                // work in all major browsers, including MSIE starting with version 10
                src: ['src/wrap_header.js', 'src/sha1.js', 'src/md5.js', 'src/utils.js', 'src/core.js', 'src/bosh.js', 'src/websocket.js', 'src/wrapper.js', 'src/wrap_footer.js'],
                dest: 'strophe.light.js',
                options: {
                    process: function(src){
                        return src.replace('@VERSION@', pkg.version)
                            .replace(/Base64\.encode/g, 'btoa')
                            .replace(/Base64\.decode/g, 'atob')
                            .replace(/, (?:root\.)?Base64/g, '')
                            .replace(/ +'strophe-base64',\r?\n/, '')
                            .replace(/,\s+"strophe-polyfill"/, '')
                            .replace(/ +(?:window\.)?Base64\s*[:=].*?Base64[,;]\r?\n/g, '');
                    }
                }
            },
            options: {
                process: function(src){
                    return src.replace('@VERSION@', pkg.version);
                }
            }
        },

        copy: {
            "prepare-release": {
                files:[
                    {
                        expand: true,
                        src:['<%= concat.dist.dest %>', 'strophe.min.js', 'LICENSE.txt', 'README.txt',
                            'contrib/**', 'examples/**', 'plugins/**', 'tests/**', 'doc/**'],
                        dest:"strophejs-<%= pkg.version %>"
                    }
                ]
            },
            "prepare-doc": {
                files:[
                    {
                        src:['<%= concat.dist.dest %>'],
                        dest:"<%= natural_docs.docs.inputs[0] %>"
                    }
                ]
            }
        },

        jshint: {
            files: ['Gruntfile.js', 'src/*.js'],
        },

        shell: {
            tar: {
                command: 'tar czf strophejs-<%= pkg.version %>.tar.gz strophejs-<%= pkg.version %>',
                options: { failOnError: true }
            },
            zip: {
                command: 'zip -qr strophejs-<%= pkg.version %>.zip strophejs-<%= pkg.version %>',
                options: { failOnError: true }
            }
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> - built on <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist: {
                files: { 'strophe.min.js': ['<%= concat.dist.dest %>'] }
            }
        },

        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['concat', 'uglify']
        },

        natural_docs: {
            docs: {
                bin: naturaldocs,
                inputs: [ "doc-tmp/" ],
                project: "ndproj",
                output: "doc"
            },
        },

        mkdir: {
            "prepare-doc": {
                options: {
                    create: ["<%= natural_docs.docs.project %>", "<%= natural_docs.docs.output %>"]
                }
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-natural-docs');
    grunt.loadNpmTasks('grunt-mkdir');
    grunt.loadNpmTasks('grunt-contrib-qunit');

    grunt.registerTask("default", ["jshint", "min"]);
    grunt.registerTask("min", ["concat:dist", "uglify"]);
    grunt.registerTask("prepare-release", ["copy:prepare-release"]);
    grunt.registerTask("doc", ["concat:dist", "copy:prepare-doc", "mkdir:prepare-doc", "natural_docs"]);
    grunt.registerTask("release", ["default", "doc", "copy:prepare-release", "shell:tar", "shell:zip"]);
    grunt.registerTask("all", ["release", "clean"]);

    grunt.registerTask('almond', 'Create an almond build with r.js', function () {
        var done = this.async();
        require('child_process').exec(
                './node_modules/requirejs/bin/r.js -o build.js optimize=none out=strophe.almond.js',
            function (err, stdout, stderr) {
                if (err) {
                    grunt.log.write('build failed with error code '+err.code);
                    grunt.log.write(stderr);
                }
                grunt.log.write(stdout);
                done();
            }
        );
        grunt.task.run('uglify');
    });
};
