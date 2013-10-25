/* global Crafty,console,game,_ */

// A Card that has a color/number (no suit, exactly)
Crafty.c('Card', {
  init: function() {
    this.group = game.newGroupId();
    this.island = game.newIslandId();
    var draw = {
      val: game.drawCard.val,
      suit: game.drawCard.suit
    };
    this.requires('Actor, Color, Text')
      .color(draw.suit)
      .textColor('#ffffff')
      .textFont({ size: Math.max(this.w-35, 20)+'px', weight: 'bold', family: 'Sans' })
      .css('text-align', 'center');
    this.suit = draw.suit;
    this.val = draw.val;
    this.updateText();
    game.cards.push(this);
  },

  getAdjacentCards: function() {
    var results = [];
    _.each(game.cards, function(card, ind) {
      if (card.intersect(this.x + this.w + game.config.cardBuffer, this.y, this.w, this.h) ||
          card.intersect(this.x - this.w - game.config.cardBuffer, this.y, this.w, this.h) ||
          card.intersect(this.x, this.y + this.h + game.config.cardBuffer, this.w, this.h) ||
          card.intersect(this.x, this.y - this.h - game.config.cardBuffer, this.w, this.h)
        ) {
        results.push(card);
      }
    }.bind(this));
    return results;
  },

  evaluateGroup: function() {
    var adjCards = this.getAdjacentCards();
    _.each(adjCards, function(card, ind) {
      if (card.suit === this.suit && card.group !== this.group) {
        card.group = this.group;
        card.updateText();
        card.evaluateGroup();
      }
    }.bind(this));
  },

  evaluateIsland: function() {
    var adjCards = this.getAdjacentCards();
    _.each(adjCards, function(card, ind) {
      if (card.island !== this.island) {
        card.island = this.island;
        card.updateText();
        card.evaluateIsland();
      }
    }.bind(this));
    this.updateText();
  },

  updateText: function() {
    this.text(this.val);// + '/' + this.island);
  },

  getPoints: function() {
    var result = 0;
    if (this.val === '&#x25b2;') {
      result = 11;
    }
    else if (this.val === '&#x25cf;') {
      result = 10;
    }
    else {
      result = +this.val;
    }
    return result;
  }

});
