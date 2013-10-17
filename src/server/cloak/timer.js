/* jshint node:true */

function Timer(name, millis, descending) {
  this.name = name;
  this.initialMillis = millis;
  this.millis = millis;
  this.descending = descending;
  this.running = false;
}

Timer.prototype = {

  start: function() {
    this.started = new Date().getTime();
    this.running = true;
  },

  stop: function() {
    this.millis = this.getValue();
    this.running = false;
  },

  getValue: function() {
    if (!this.running) {
      return this.millis;
    }
    else if (this.descending) {
      return this.millis - (new Date().getTime() - this.started);
    }
    else {
      return this.millis + (new Date().getTime() - this.started);
    }
  },

  reset: function(millis) {
    this.running = false;
    if (millis !== undefined) {
      this.initialMillis = millis;
      this.millis = millis;
    }
    else {
      this.millis = this.initialMillis;
    }
  },

  sync: function(user) {
    user._serverMessage('syncTimer', {
      name: this.name,
      value: this.getValue(),
      sent: new Date().getTime(),
      running: this.running,
      descending: this.descending
    });
  }

};

module.exports = Timer;