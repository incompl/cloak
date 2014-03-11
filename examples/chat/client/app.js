/* global cloak */

var form = document.querySelector('#input-form');
var input = document.querySelector('#input');
var messages = document.querySelector('#messages');
var counter = document.querySelector('#counter');

cloak.configure({
  messages: {
    chat: function(msg) {
      var message = document.createElement('div');
      message.innerText = msg;
      message.className = 'msg';
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    },
    userCount: function(count) {
      counter.innerText = count;
    }
  },
});

cloak.run('http://localhost:8090');

form.addEventListener('submit', function(e) {
  e.preventDefault();
  var msg = input.value;
  if (msg.length < 1) {
    return;
  }
  cloak.message('chat', msg);
  input.value = '';
});
