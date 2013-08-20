cloak
==================

## What is it?

A library for building multiplayer games with socket.io

## Documentation

This documentation is currently for planning and may not reflect implemented functionality.

### Server Configuration

* `port` to run on
* `defaultRoomSize` 1+ (set to "1" if you don't really want "rooms")
* `autoJoinRoom` true/false
* `autoCreateRooms` true/false create rooms as needed, otherwise server must manually create rooms before anyone can connect
* `reconnectWait` how long the server waits for a user to reconnect before removing them from any rooms they're in
* `messages`
  * custom events to handle messages from client
* `room`
  * `init` callback on new room
  * `pulse` called periodically for rooms
  * `close` callback on closing of room

### Client Configuration

* `messages`
  * custom events to handle messages from server
* `serverEvents`
  * `connect` (socket.io connect)
  * `disconnect` (socket.io connect)
  * `begin` (cloak begin, after connect)
  * `resume` (cloak resume, after connect)
  * `end` (cloak end, after disconnect)
  * `error` (cloak error message)