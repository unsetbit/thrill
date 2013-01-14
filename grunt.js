var utils = require('./lib/utils.js');

function addAdapterLibrariesToConfig(config){
  var adapters = require('./').adapters;

  utils.each(adapters, function(filePath, name){
      if(!("hug" in config)) config.hug = {};
      if(!("min" in config)) config.min = {};

      var adapterDest = 'build/thrill-' + name + '-adapter.js';
      var adapterSrc = 'lib/client/adapter/' + name + '.js';
      config.hug[name] = {
          src: [adapterSrc],
          dest: adapterDest,
          exports: adapterSrc,
          exportedVariable: 'thrill'
      };
      
      config.min[name] = {
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
        client: {
          qunit: [
            'test/resource/qunit.js',
            'test/client/qunit.js'
          ],
          jasmine: [
            'test/resource/jasmine.js',
            'test/client/jasmine.js'
          ],
          mocha: [
            'test/resource/mocha.js',
            'test/client/mocha.js'
          ],
          yuitest: 'test/client/yuitest.html'
        },
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
      qunit: {
        run: '<config:files.test.client.qunit>'
      },
      jasmine: {
        run: '<config:files.test.client.jasmine>'
      },
      mocha: {
        run: '<config:files.test.client.mocha>'
      },
      yuitest: {
        run: '<config:files.test.client.yuitest>',
        serve: 'test/resource/yuitest',
        verbose: false
      }
      /* EXAMPLE RUNNERS 
      scriptOnly: './example/scriptOnly/thrill.js',
      scriptOnlyAlternate: {
        file: './example/scriptOnly/thrill.js',
        host: 'localhost',
        timeout: 10 * 1000
      },
      scriptOnlyAlternate2: {
        run: ['./example/qunit.js', './example/scriptOnly/test*.js'],
        host: 'localhost'
      }*/
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

  addAdapterLibrariesToConfig(config);

  // Project configuration.
  grunt.initConfig(config);
};