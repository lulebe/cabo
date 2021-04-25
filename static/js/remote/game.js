const socket = io(window.location.origin);
socket.on('connect', function(){
  socket.emit('remote-data', {game: gameName, user: userName})
})