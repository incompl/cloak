/* global Crafty,_,console,game,player,cloak,escape */
_.extend(game, {

  registerUsername: function() {
    var loginUIElement = document.getElementById('login-ui');
    var loginElement = document.getElementById('login');
    if (loginElement.value.trim() === '') {
      loginUIElement.innerHTML += '<p>Enter a valid username!</p>';
      return;
    }
    game.username = loginElement.value;
    // Register our username with the server
    cloak.message('registerUsername', {
      username: game.username
    });
  },

  createRoom: function() {
    var newRoomElement = document.getElementById('new-room');
    var newRoomUIElement = document.getElementById('new-room-ui');
    if (newRoomElement.value.trim() === '') {
      newRoomUIElement.innerHTML += '<p>Enter a valid username!</p>';
      return;
    }
    cloak.message('createRoom', {
      name: escape(newRoomElement.value)
    });
  },

  refreshLobby: function(users) {
    console.log('refreshing lobby');
    cloak.message('listUsers');
    cloak.message('listRooms');
  },

  refreshWaiting: function() {
    cloak.message('refreshWaiting');
  },

  joinRoom: function(id) {
    cloak.message('joinRoom', id);
  }

});
