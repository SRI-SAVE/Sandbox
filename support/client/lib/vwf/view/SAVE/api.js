/*
Copyright 2016 SRI International

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
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
