/* jshint node:true */

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    copy: {
      main: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['src/server/cloak/*.js',
                  'src/server/package.json'],
            dest: 'dest',
            filter: 'isFile'
          },
          {
            src: 'src/client/cloak.js',
            dest: 'dest/cloak-client.js'
          },
          {
            src: 'README.md',
            dest: 'dest/README.md'
          }
        ]
      }
    },

    uglify: {
      options: {
        banner: '/* cloak client */\n'
      },
      build: {
        src: 'src/client/cloak.js',
        dest: 'dest/cloak-client.min.js'
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['copy', 'uglify']);

};