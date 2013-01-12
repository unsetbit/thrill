var ADAPTER_LIBRARIES = ['qunit','jasmine','mocha'];

function addAdapterLibrariesToConfig(libraries, config){
  libraries.forEach(function(name){
    if(!("hug" in config)) config.hug = {};
    if(!("min" in config)) config.min = {};

    var adapterDest = 'build/thrill-' + name + '-adapter.js';

    config.hug[name] = {
        src: ['./lib/client/adapters/' + name + '.js', './lib/client/thrill.js'],
        dest: adapterDest,
        exports: './lib/client/adapters/' + name + '.js',
        exportedVariable: 'thrill'
    };
    
    config.min[name + "Adapter"] = {
        src: ['<banner:meta.banner>', adapterDest],
        dest: './dist/thrill-' + name + '-adapter.js'
    };

    config.min[name] = {
       src: ['<banner:meta.banner>', './lib/client/lib/' + name + '.js', adapterDest],
        dest: './dist/thrill-' + name + '.js'
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
      server: ['server/lib/**/*.js'],
      client: ['lib/client/*.js', 'lib/client/adapters/**/*.js'],
      grunt: ['grunt.js', 'tasks/*.js']
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
      qunit: {
        run: './example/qunit/index.html',
        serve: {
          'qunit.js': './client/lib/qunit.js',
          'qunit-adapter.js': './client/lib/adapters/qunit.js',
          '': './example/qunit/'
        },
        host: "192.168.0.100",
        timeout: 10 * 1000
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
          sub: true
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