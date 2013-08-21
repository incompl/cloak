/* global Crafty,console,game,_,cloak */

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
    // If this target already has a card on it, the draw card isn't fresh,
    // or it's not your turn don't place anything
    if (this.used || !game.drawCard.fresh || game.turn !== game.team) {
      return;
    }
    this.placeCard();

    // Done with turn, let the server know where we clicked
    cloak.message('turnDone', this[0]);
  },

  placeCard: function() {
    var card = Crafty.e('Card')
      .attr({ x: this.x, y: this.y });
    card.getAdjacentCards();
    card.evaluateGroup();
    game.updateGroups();
    game.removeAndScore();
    this.used = true;
    game.drawCard.setFresh(false);

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
  },

  // if I am next to a card, then refresh me, I'm a valid target
  // if I'm under a card, don't refresh me but I should continue to exist
  // otherwise destroy me
  refresh: function() {
    var valid = false;
    var destroy = true;
    var target = this;
    Crafty('Card').each(function() {
      if (this.intersect(target.x + target.w + game.config.cardBuffer, target.y, target.w, target.h) ||
          this.intersect(target.x - target.w - game.config.cardBuffer, target.y, target.w, target.h) ||
          this.intersect(target.x, target.y + target.h + game.config.cardBuffer, target.w, target.h) ||
          this.intersect(target.x, target.y - target.h - game.config.cardBuffer, target.w, target.h)
        ) {
        valid = true;
        destroy = false;
      }
      if (this.intersect(target.x, target.y, target.w, target.h)) {
        destroy = false;
      }
    });
    if (valid) {
      this.used = false;
    }
    else if (destroy) {
      this.destroy();
      var currentTarget = this;
      game.targets = _.reject(game.targets, function(thisTarget) { return _.isEqual(thisTarget, currentTarget); });
    }
  }

});
