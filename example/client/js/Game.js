/* global Crafty,_,console,game,player */

window.game = (function() {
  return {
    config: {},

    begin: function() {
      Crafty.init(game.config.gameWidth, game.config.gameHeight, document.getElementById('game'));
      Crafty.background('#ddd');

      game.targets = [];
      var home = Crafty.e('Target');
      home.attr({
          x: game.config.gameWidth/2 - home.w,
          y: game.config.gameHeight/2 - home.h
        });

      // generate deck (move to server)
      game.deck = [];
      var nums = ['A', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'O', 'O', 'O', 'O'];
      _.each(nums, function(num) {
        game.deck.push({ suit: 'black', val: num });
        game.deck.push({ suit: 'black', val: num });
        game.deck.push({ suit: 'red', val: num });
        game.deck.push({ suit: 'red', val: num });
      });

      game.draw = function() {
        return game.deck[Math.floor(Math.random()*game.deck.length)];
      };
      

    }
  };
})();
