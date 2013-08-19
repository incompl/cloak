/* globals module */

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      options: {
        'undef': true,
        'browser': true,
        '-W008': true
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      app: {
        src: ['js/*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      app: {
        files: '<%= jshint.app.src %>',
        tasks: ['jshint:app']
      }
    },
    copy: {
      prod: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['../../src/client/cloak.js'],
            dest: 'lib',
            filter: 'isFile'
          }
        ]
      },
    }

  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // Default task.
  grunt.registerTask('default', ['jshint', 'copy:prod']);

};
