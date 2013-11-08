/* global Crafty,console,game,_,cloak */

// A Target is an empty space you can put a card on
Crafty.c('Target', {
  init: function() {
    this.requires('Actor, Color, Mouse')
      .color('#aaa')
      .bind('Click', function() {
        this.onClick();
      });
    this.targetId = game.targetIdCounter;
    game.targetIdCounter++;
    game.targets.push(this);
    this.used = false;
  },

  onClick: function() {
    var intersectingCard = this.getIntersectingCard();

    // If the draw card isn't fresh,
    // or it's not your turn don't place anything
    if ( !game.drawCard.fresh || game.turn !== game.team ) {
      return;
    }

    if (intersectingCard) {
      // If there is an intersecting card and it is not a single number value
      // above or below our draw card or it is not our own color,
      // then don't place anything
      var targetVal = +intersectingCard.val || -1, // if not a numbered card, set to invalid value
          drawVal = +game.drawCard.val;
      if ( (Math.abs(targetVal - drawVal) !== 1 || intersectingCard.suit !== game.turn)) {
        return;
      }
    }

    this.placeCard();

    // Done with turn, let the server know where we clicked
    cloak.message('turnDone', this.targetId);
  },

  getIntersectingCard: function() {
    // See if there is a card on this target
    var intersect = false,
        // Make an invalid skeleton card
        intersectingCard = {val: '-1', suit: 'none', remove: function() {}};

    for (var i=0; i<game.cards.length; i++) {
      if (game.cards[i].intersect(this.x, this.y, this.w, this.h)) {
        intersect = true;
        intersectingCard = game.cards[i];
        break;
      }
    }

    // Return the intersecting card, or false if no intersecting card
    if (intersect) {
      return intersectingCard;
    }
    else {
      return false;
    }
  },

  placeCard: function() {
    // First remove whatever card is intersecting here, if any
    var intersectingCard = this.getIntersectingCard();
    if (intersectingCard) {
      intersectingCard.remove();
    }
    var card = Crafty.e('Card')
      .attr({ x: this.x, y: this.y });
    card.getAdjacentCards();
    card.evaluateGroup();
    game.updateGroups();
    card.evaluateIsland();
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
