/* global Crafty,_,console,game,player,cloak */

window.game = (function() {
  return {

    // ** GAME INIT **

    _groupIdCounter: 0,
    _islandIdCounter: 0,
    targetIdCounter: 0,
    config: {},
    room: {},

    begin: function() {
      var gameUIElement = document.getElementById('game-ui');
      var gameElement = document.getElementById('game');
      var infoElement = document.getElementById('info');
      var networkUIElement = document.getElementById('network-ui');
      var waitingForPlayerElem = document.getElementById('waitingForPlayer');
      gameElement.style.display = 'block';
      gameUIElement.style.display = 'block';
      infoElement.style.display = 'block';
      networkUIElement.style.display = 'none';
      waitingForPlayerElem.style.display = 'block';

      Crafty.background('rgba(0,0,0,0)');
      
      // Place our home target
      game.targetIdCounter = 0;
      game.targets = [];
      game.placeHomeTarget();

      // Place our draw spot
      game.drawCard = Crafty.e('CardDrawn');
      game.drawCard.attr({
        x: game.config.cardBuffer,
        y: game.config.cardBuffer
      });

      Crafty.e('2D, DOM, Text').attr({
        x: game.drawCard.x + game.drawCard.w + game.config.cardBuffer,
        y: game.drawCard.y
      })
        .textFont({ size: Math.max(game.drawCard.h / 4, 14)+'px', weight: 'bold', family: 'Sans' })
        .text('DRAW')
        .textColor('black');

      // set up groups
      game.groups = {};
      game.groups.sum = {};
      game.groups.count = {};

      // store all the cards on the board here
      game.cards = [];

      // set up islands
      game.islands = {};
    },

    placeHomeTarget: function() {
      var home = Crafty.e('Target');
      home.attr({
        x: game.config.gameWidth/2 - home.w,
        y: game.config.gameHeight/2 - home.h
      });
    },

    // ** GENERAL GAME CODE **

    updateTurn: function() {
      var turnText = (game.turn === game.team) ? 'Your Turn' : 'Their Turn';
      var turnColor = (game.turn === game.team) ? '#C8FFCD' : '#DDD';
      document.getElementById('turn').innerText = turnText;
      document.getElementsByTagName('body')[0].style.background = turnColor;
    },

   refreshTargets: function() {
      Crafty('Target').each(function() {
        this.refresh();
      });
      // if we have no targets at all left, place a target in the middle.
      if (_.isEmpty(game.groups.sum)) {
        setTimeout(game.placeHomeTarget(),0);
      }
    },

    draw: function() {
      cloak.message('requestCard');
    },

    // ** GROUP TRACKING **
    // Groups are individual single-color groups of cards.

    newGroupId: function() {
      return this._groupIdCounter++;
    },

    getGroupCards: function(group) {
      _.filter(game.cards, function(card) {
        return card.group === group;
      });
    },

    updateGroups: function() {
      game.groups.sum = {};
      game.groups.count = {};
      var groupsWithAces = [];

      _.each(game.cards, function(card) {
        if (_.has(game.groups.count,card.group)) {
          game.groups.count[card.group] += 1;
        }
        else {
          game.groups.count[card.group] = 1;
        }
        if (_.has(game.groups.sum,card.group)) {
          game.groups.sum[card.group] += card.getPoints();
        }
        else {
          game.groups.sum[card.group] = card.getPoints();
        }
        // Keep note of groups that have aces in them
        if (card.getPoints() === 11) {
          groupsWithAces.push(card.group);
        }
      }.bind(this));
      // Check to see if groups with aces are "bust", if so, revalue ace -> 1
      // This works even if there are two aces in a group. If sum is
      // over 31: 32 becomes 12, but if sum is 30 it only becomes 20
      _.each(groupsWithAces, function(group) {
        if (game.groups.sum[group] > 21) {
          game.groups.sum[group] -= 10;
        }
      }.bind(this));
    },

    removeGroupById: function(groupsToRemove, property) {
      _.each(game.cards, function(card) {
        if (_.contains(groupsToRemove, card[property]+'')) {
          card.remove();
        }
      });
    },

   // ** ISLAND TRACKING **
    // Islands are physical groupings of groups. Usually there is only one
    // island, but sometimes when cards are removed from play we have more than
    // one. In these cases we identify the largest island by number of cards,
    // and remove all other islands.

    newIslandId: function() {
      return this._islandIdCounter++;
    },

    updateIslands: function() {
      this._islandIdCounter = 0;
      game.islands = {};
      // first go through every card and update its island value
      _.each(game.cards, function(card) {
        card.island = game.newIslandId();
        card.evaluateIsland();
      }.bind(this));
      // now that the board is updated we can evaluate island card counts
      _.each(game.cards, function(card) {
        if (_.has(game.islands, card.island)) {
          game.islands[card.island] += 1;
        }
        else {
          game.islands[card.island] = 1;
        }
      }.bind(this));
      var largestIsland = _.max(_.pairs(game.islands), function(el) { return el[1]; })[0];
      // tag every island that's not the largest as a group to remove
      var groupsToRemove = _.chain(game.islands)
                              .omit(largestIsland)
                              .keys()
                              .value();
      game.removeGroupById(groupsToRemove, 'island');
    },

  // ** SCORING **

    score: {
      _score: {
        red: 0,
        black: 0
      },
      _el: {
        // Make two elements TODO
        score: document.getElementById('score'),
        theirScore: document.getElementById('theirScore')
      },
      get: function(suit) {
        return this._score[suit];
      },
      set: function(suit, num) {
        this._score[suit] = num;
        if (suit === game.team) {
          this._el.score.innerText = num;
        }
        else {
          this._el.theirScore.innerText = num;
        }
      },
      reset: function() {
        game.score.set('red', 0);
        game.score.set('black', 0);
      }
    },

    removeAndScore: function() {
      var groupsToRemove = [];
      _.each(game.groups.sum, function(val, key) {
        var groupSuit = _.filter(game.cards, function(el) {
          return el.group+'' === key;
        })[0].suit;
        if (val === 21) {
          groupsToRemove.push(key);
          game.score.set(groupSuit, game.score.get(groupSuit) + 10);
        }
      });
      game.removeGroupById(groupsToRemove, 'group');
      // Weirdly, this triggers "too soon" sometimes so I put in this timeout
      setTimeout(game.refreshTargets, 0);
      game.updateIslands();
      game.refreshTargets();
      game.updateGroups();
    },

    finalScore: function() {
      this.removeAndScore();
      // If it's a tie game, run tiebreaker logic
      if (game.score.get(game.team) === game.score.get(game.otherTeam)) {
        _.each(game.groups.sum, function(val, key) {
          var groupSuit = _.filter(game.cards, function(el) {
            return el.group+'' === key;
          })[0].suit;
          if (val === 22 || val === 20) {
            game.score.set(groupSuit, game.score.get(groupSuit) + 5);
          }
          if (val === 23 || val === 19) {
            game.score.set(groupSuit, game.score.get(groupSuit) + 2);
          }
        });
      }
    },

    // ** END OF GAME CODE **

    end: function() {
      // Reset score
      game.score.reset();
      // Hide game over message
      game.showGameOver(false);
      // Remove every object in the game
      Crafty('*').each(function() {
        this.destroy();
      });
    },

    returnToLobby: function() {
      cloak.leaveRoom(function() {
        cloak.joinLobby(function() {
        });
        console.log('ending game');
        game.end();
        game.refreshLobby();
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('network-ui').style.display = 'block';
      });
    },

    // If passed "false", hides the gameOver dialog, otherwise displays string
    showGameOver: function(msg) {
      var gameOverElement = document.getElementById('gameOver'),
          gameOverMsgElement = document.getElementById('gameOverMsg'),
          waitingForPlayerElem = document.getElementById('waitingForPlayer');
      if (msg === false)  {
        gameOverElement.style.display = 'none';
      }
      else {
        gameOverMsgElement.innerText = msg;
        gameOverElement.style.display = 'block';
        waitingForPlayerElem.style.display = 'none';
      }
    }

  };
})();
