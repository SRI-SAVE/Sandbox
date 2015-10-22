define([ ], function() {
	return {
		create: function(ID, auto, done) {
			var data = JSON.stringify({
				type: 'create',
				auto: auto,
				ID: ID,
			});

			fetch(this.baseServerAddress + "/object", {
				method: 'post',
				mode: 'cors',
				body: 'object=' + data,
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

		action: function(action, arguments, names, done) {
			var data = JSON.stringify({
				action: action,
				arguments: arguments,
				names: names,
			});

			fetch(this.baseServerAddress + "/action", {
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
