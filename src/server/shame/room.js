/* jshint node:true */

module.exports = (function() {

  function Room(name, size) {
    name: name,
    users: [],
    size: size || config.defaultRoomSize,
    created: new Date().getTime()
  }

  Room.prototype = {

  };

  return Room;

})();