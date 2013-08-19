cloak
==================

A library for building multiplayer games with socket.io

## Server Configuration

This section is currently for planning and does not reflect implemented functionality.

* `port` to run on
* `defaultRoomSize` 1+ (set to "1" if you don't really want "rooms")
* `autoJoinRoom` true/false
* `autoCreateRooms` true/false create rooms as needed, otherwise server must manually create rooms before anyone can connect
* `reconnectWait` how long the server waits for a user to reconnect before removing them from any rooms they're in
