var ADAPTER_LIBRARIES = ['qunit','jasmine','mocha'];

function addAdapterLibrariesToConfig(libraries, config){
  libraries.forEach(function(name){
    if(!("hug" in config)) config.hug = {};
    if(!("min" in config)) config.min = {};

    var adapterDest = 'build/thrill-' + name + '-adapter.js';

    config.hug[name] = {
        src: ['./lib/client/adapter/' + name + '.js'],
        dest: adapterDest,
        exports: './lib/client/adapter/' + name + '.js',
        exportedVariable: 'thrill'
    };
    
    config.min[name + "Adapter"] = {
        src: ['<banner:meta.banner>', adapterDest],
        dest: './dist/thrill-' + name + '-adapter.js'
    };
  });
}

module.exports = function(grunt) {
  grunt.registerTask('default', 'clean lint hug min');
  grunt.loadNpmTasks('grunt-thrill');
  grunt.loadNpmTasks('grunt-hug');
  grunt.loadNpmTasks('grunt-contrib-clean');

  var config = {
    pkg: '<json:package.json>',
    files: {
      server: ['lib/server/**/*.js'],
      client: ['lib/client/*.js', 'lib/client/adapter/**/*.js'],
      test: {
        server: ['test/server/**/*.js']
      }
    },
    meta: {
      banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
    },
    watch: {
      client: {
        files: '<config:files.client>',
        tasks: 'default'
      }
    },
    thrill: {
      basic: {
        run: './example/basic/test*.js',
        library: "qunit",
        host: "192.168.0.100",
        timeout: 10 * 1000
      }
    },
    hug: {
      thrill: {
        src: ['./lib/client/thrill.js'],
        dest: './build/thrill.js',
        exports: './lib/client/thrill.js',
        exportedVariable: 'thrill'
      }
    },
    min: {
      thrill: {
        src: "<config:hug.thrill.dest>",
        dest: "./dist/thrill.js"
      }
    },
    lint: {
      server: '<config:files.server>',
      client: '<config:files.client>'
    },
    clean: {
      build: ['./build'],
      dist: ['./dist']
    },
    test: {
      lib: '<config:files.test.server>'
    },
    jshint: {
      client: {
        options: {
          browser: true,
          sub: true
        }
      },
      server: {
        options: {
          node: true,
          sub: true,
          strict: false
        }
      },
      options: {
        quotmark: 'single',
        camelcase: true,
        strict: true,
        trailing: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        undef: true,
        boss: true,
        sub: true
      },
      globals: {      }
    }
  };

  addAdapterLibrariesToConfig(ADAPTER_LIBRARIES, config);

  // Project configuration.
  grunt.initConfig(config);
};