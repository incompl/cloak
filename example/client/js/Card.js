/* global Crafty,console,game,_ */

// A Card that has a color/number (no suit, exactly)
Crafty.c('Card', {
  init: function() {
    this.group = game.newGroupId();
    var draw = game.draw();
    this.requires('Actor, Color, Text')
      .color(draw.suit)
      .textColor('#ffffff')
      .textFont({ size: (this.w-35)+'px', weight: 'bold', family: 'Sans' })
      .text(draw.val + '/' + this.group)
      .css('text-align', 'center');
    this.suit = draw.suit;
    this.val = draw.val;
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

  updateText: function() {
    this.text(this.val + '/' + this.group);
  },

  getPoints: function() {
    var result = 0;
    if (this.val === 'A') {
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
