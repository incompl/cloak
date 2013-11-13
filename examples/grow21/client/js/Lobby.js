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
    cloak.registerUsername(game.username, function(success) {
      console.log(success ? 'username registered' : 'username failed');
      // if we registered a username, try to join the lobby
      if (success) {
        // get the lobby
        cloak.joinLobby(function(success) {
          console.log('joined lobby');
          game.refreshLobby();
        });
      }
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
    var lobbyElement = document.getElementById('lobby'),
        lobbyListElement = document.getElementById('lobby-list'),
        newRoomUIElement = document.getElementById('new-room-ui'),
        roomsElement = document.getElementById('rooms'),
        roomListElement = document.getElementById('room-list');

    cloak.listUsers(function(users) {
      console.log('other users in room', users);
      lobbyElement.style.display = 'block';
      lobbyListElement.style.display = 'block';
      newRoomUIElement.style.display = 'block';
      roomsElement.style.display = 'block';
      roomListElement.style.display = 'block';
      lobbyListElement.innerHTML = '<ul>';
      _.chain(users)
        .each(function(user) {
          if (user.room.lobby) {
            lobbyListElement.innerHTML += '<li>' + escape(user.username) + '</li>';
          }
          else {
            lobbyListElement.innerHTML += '<li>' + escape(user.username) + ' (' + user.room.userCount + '/' + user.room.size + ')</li>';
          }
        });
      lobbyListElement.innerHTML += '</ul>';
    });

    cloak.message('listRooms');
  },

  refreshWaiting: function() {
    cloak.getRoomMembers(game.room.id, function(members) {
      if (!members) {
        return;
      }
      var waitingForPlayerElem = document.getElementById('waitingForPlayer');
      if (members.length < 2) {
        waitingForPlayerElem.style.display = 'block';
      }
      else {
        waitingForPlayerElem.style.display = 'none';
      }
    });
  },

  joinRoom: function(id) {
    cloak.joinRoom(id, function(success) {
      if (success) {
        game.room.id = id;
        game.begin();
        game.refreshWaiting();
      }
    });
  }

});
