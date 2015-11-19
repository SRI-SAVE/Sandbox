define([ ], function() {
  return {
    action: function(action, arguments, names, done, fail) {
      var data = JSON.stringify({
        action: action,
        arguments: arguments,
        names: names,
      });

      fetch(this.baseServerAddress + "/action", {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        method: 'post',
        mode: 'cors',
        body: 'activity=' + data,
      })
      .then(function(response) { return response.json(); })
      .then(function(json) {
        if (done) done(json);
      })
      .catch(function(e) {
        console.error(e);

        if (fail) fail();
      });
    },

    KbId: function(Id, parentKbId, done, fail)	{
      var data = JSON.stringify({
        type: 'KbId',
        parent: parentKbId,
        query: [ Id + "_KbId" ]
      });

      fetch(this.baseServerAddress + '/query', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        method: 'post',
        mode: 'cors',
        body: 'query=' + data,
      })
      .then(function(response) { return response.json(); })
      .then(function(json) {
        if (done) done(json);
      })
      .catch(function(e) {
        console.error(e);

        if (fail) fail();
      });
    },

    setBaseServerAddress: function(addr) {
      this.baseServerAddress = addr;
    }
  }
})
