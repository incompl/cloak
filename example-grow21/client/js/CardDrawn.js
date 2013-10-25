/* global Crafty,console,game,_ */

// A Card that has a color/number (no suit, exactly)
Crafty.c('CardDrawn', {
  blankSpace: {
    suit: '#666',
    val: ''
  },

  init: function() {
    var fontSize = ((this.w-35) > 20) ? (this.w-35) : 20;
    this.requires('Actor, Color, Text, Mouse')
      .bind('Click', function() {
        this.onClick();
      })
      .color(this.blankSpace.suit)
      .textColor('#ffffff')
      .textFont({ size: fontSize+'px', weight: 'bold', family: 'Sans' })
      .css('text-align', 'center');
    this.suit = this.blankSpace.suit;
    this.val = this.blankSpace.val;
    this.updateText();
    this.fresh = false;
  },

  updateText: function() {
    this.text(this.val);
    this.color(this.suit);
  },

  onClick: function() {
    console.log('clicked!');
    // If this already has a fresh card on it, or it's not your turn, don't draw
    if (this.fresh || game.turn !== game.team) {
      return;
    }
    console.log('draw a card');
    game.draw();
  },

  setFresh: function(fresh) {
    this.fresh = fresh;
    if (!fresh) {
      this.suit = this.blankSpace.suit;
      this.val = this.blankSpace.val;
    }
    this.updateText();
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
