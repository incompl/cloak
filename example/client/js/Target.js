/* global Crafty,console,game,_ */

// A Target is an empty space you can put a card on
Crafty.c('Target', {
  init: function() {
    this.requires('Actor, Color, Mouse')
      .color('#aaa')
      .bind('Click', function() {
        this.onClick();
      });
    game.targets.push(this);
    this.used = false;
  },

  onClick: function() {
    if (this.used) {
      return;
    }
    var card = Crafty.e('Card')
      .attr({ x: this.x, y: this.y });
    card.getAdjacentCards();
    card.evaluateGroup();
    this.used = true;

    // add the empty targets around the card
    this.placeTargetIfEmpty(this.x + this.w + game.config.cardBuffer, this.y); 
    this.placeTargetIfEmpty(this.x - this.w - game.config.cardBuffer, this.y); 
    this.placeTargetIfEmpty(this.x, this.y + this.h + game.config.cardBuffer); 
    this.placeTargetIfEmpty(this.x, this.y - this.h - game.config.cardBuffer); 
  },

  targetInRect: function(target, x, y) {
    return target.intersect(x, y, this.w, this.h);
  },

  placeTargetIfEmpty: function(x, y) {
    var valid = true;
    // If even a single target intersects with this rectangle, it's invalid
    _.each(game.targets, function(target) {
      if (this.targetInRect(target, x, y)) {
        valid = false;
      }
    }.bind(this));
    if (valid) {
      Crafty.e('Target')
        .attr({ x: x, y: y });
    }
  }

});
