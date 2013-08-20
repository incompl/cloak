/* global Crafty,console,game,_ */

// An "Actor" is a generic entity
Crafty.c('Actor', {
  init: function() {
    this.requires('DOM, 2D')
      .attr({ w: game.config.cardWidth, h: game.config.cardHeight });
  },
});
