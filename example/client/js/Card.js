/* global Crafty,console,game,_ */

// A Card that has a color/number (no suit, exactly)
Crafty.c('Card', {
  init: function() {
    this.requires('Actor, Color, Text')
      .color('#f33')
      .textColor('#ffffff')
      .textFont({ size: (this.w-5)+'px', weight: 'bold', family: 'Sans' })
      .css('text-align', 'center');
  }
});
