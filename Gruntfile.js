module.exports = function (grunt) {

  var pkg = grunt.file.readJSON('package.json');

  // Project configuration.
  grunt.initConfig({
    pkg: pkg,

    githooks: {
      all: {
        'pre-commit': 'jsbeautifier:git-pre-commit'
      }
    },

    jsbeautifier: {
      options: {
        config: '.jsbeautifyrc'
      },
      "default": {
        src: ["lib/**/*.js", "*.js", "test/*.js", "backend/*.js"]
      },
      "git-pre-commit": {
        src: ["lib/**/*.js", "*.js", "test/*.js", "backend/*.js"],
        options: {
          config: '.jsbeautifyrc',
          mode: 'VERIFY_ONLY' 
          //mode: 'VERIFY_AND_WRITE'
        }
      }
    },

    jshint: {
      all: ['backend/**/*.js', "server.js"],
      options: {
        jshintrc: true
      },
    }

  });

  // Load plugins
  grunt.loadNpmTasks('grunt-jsbeautifier');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Alias tasks
  grunt.registerTask('default', [
    'jsbeautifier:git-pre-commit'
  ]);
};
