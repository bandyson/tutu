// This event is fired each time the user updates the text in the omnibox,
// as long as the extension's keyword mode is still active.
chrome.omnibox.onInputChanged.addListener(
  function(text, suggest) {
    console.log('inputChanged: ' + text);
    /*
    suggest([
      {content: text + " one", description: "the first one"},
      {content: text + " number two", description: "the second entry"}
    ]);
    */
  });

  // This event is fired with the user accepts the input in the omnibox.
  chrome.omnibox.onInputEntered.addListener(
    function(text) {
      console.log('inputEntered: ' + text);
      // alert('You just typed "' + text + '"');

      callVend(text, function() {
        console.log('callVend callback');
      }, function(errorMessage) {
        console.log('callVend error. message: ' + errorMessage);
      });

      var job = getJob(text);

      // TODO: move inside the callback.
      var sale = createSale(job);

      postSale(sale, function() {
        console.log('postSale callback');
        console.log(sale);
      }, function(errorMessage) {
        console.log('postSale error. message: ' + errorMessage);
      });

      /*getImageUrl(text, function(imageUrl, width, height) {
        console.log('Callback for getImageUrl. Search term: ' + text + '\n' +
        'Google image search result: ' + imageUrl);
        console.log('width: ' + width + '. height: ' + height + '. if you care.');
      }, function(errorMessage) {
        console.log('Cannot display image. ' + errorMessage);
      });*/
    });

    function getJob(jobNumber, callback, errorCallback) {
      console.log('getJob(). jobNumber: ' + jobNumber);
      // TODO: call RepairCMS
      return {'job': 'some fake job'};
    }

    function createSale(job) {
      // TODO: get a real job!
      var sale = {
         "register_id": "31eb0866-e756-11e5-fed9-8136c14c4177",
         "sale_date": "2015-10-14 00:06:15", // TODO: will it default to now?
         "user_id": "31eb0866-e756-11e5-fed9-8136c14db57d",
         "total_price": 100.00,
         "total_tax":10,
         "tax_name": "GST",
         // TODO: change to PARKED
         "status": "LAYBY",
         "note": null,
         "line_items": [
           {
             // APPLE IPHONE 30 PIN DATA CABLE
             "product_id": "31eb0866-e75f-11e5-fed9-84e950e7626a",
             "unit_price": 100.00,
             "quantity": 1,
             // TODO: what does this mean? true? i do want to set the price.
             "price_set": false,
             /*
             "tax_components": [
               {
                 "rate_id": "080027db-dc32-11e5-fe35-721c2068d021",
                 "total_tax": 3
               },
               {"rate_id": "080027db-dc32-11e5-fe35-721c1b38eb2a",
                 "total_tax": 5
                 }
             ],
             */
             "sequence": 0,
             "note": "The line item note",
             "status": "CONFIRMED"
           }
         ]
      };

      return sale;
    }

    // TODO: function getJob()

    function postSale(sale, callback, errorCallback) {
      console.log('postSale()');
      console.log(sale);

      var baseUrl = 'https://fonekingdemo.vendhq.com';
      var url = baseUrl + '/api/2.0/sales';
      var x = new XMLHttpRequest();
      // x.setRequestHeader('Content-Type', 'application/json');
      // x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      // x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      // x.Content-Type = 'application/json';
      x.open('POST', url);

      x.responseType = 'json';

      x.onload = function() {
        var response = x.response;
        var resp = JSON.parse(x.responseText);
        var yolo = 'x';
        /*var data = response.data;
        for (i = 0; i < data.length; i++) {
            var product = data[i];
            console.log('Product: ' + product.name);
        }*/
      }

      x.onerror = function() {
        errorCallback('Network error.');
      };

      x.send(JSON.stringify(sale));
    }

    function callVend(sku, callback, errorCallback) {
      console.log('callVend: ' + sku);

      var baseUrl = 'https://fonekingdemo.vendhq.com';
      var url = baseUrl + '/api/2.0/products';

      var x = new XMLHttpRequest();
      x.open('GET', url);
      x.responseType = 'json';

      x.onload = function() {
        var response = x.response;
        var data = response.data;
        for (i = 0; i < data.length; i++) {
            var product = data[i];
            // console.log('Product: ' + product.name);
        }
        /*
        todo: if no data
          errorCallback('No response from' + url);
          return;
        */
      }

      x.onerror = function() {
        errorCallback('Network error.');
      };

      x.send();
    }

    /**
    * @param {string} searchTerm - Search term for Google Image search.
    * @param {function(string,number,number)} callback - Called when an image has
    *   been found. The callback gets the URL, width and height of the image.
    * @param {function(string)} errorCallback - Called when the image is not found.
    *   The callback gets a string that describes the failure reason.
    */
    function getImageUrl(searchTerm, callback, errorCallback) {
      // Google image search - 100 searches per day.
      // https://developers.google.com/image-search/
      console.log('ben was here: ' + searchTerm);

      var searchUrl = 'https://ajax.googleapis.com/ajax/services/search/images' +
      '?v=1.0&q=' + encodeURIComponent(searchTerm);
      var x = new XMLHttpRequest();
      x.open('GET', searchUrl);
      // The Google image search API responds with JSON, so let Chrome parse it.
      x.responseType = 'json';
      x.onload = function() {
        // Parse and process the response from Google Image Search.
        var response = x.response;
        if (!response || !response.responseData || !response.responseData.results ||
          response.responseData.results.length === 0) {
            errorCallback('No response from Google Image search!');
            return;
          }
          var firstResult = response.responseData.results[0];
          // Take the thumbnail instead of the full image to get an approximately
          // consistent image size.
          var imageUrl = firstResult.tbUrl;
          var width = parseInt(firstResult.tbWidth);
          var height = parseInt(firstResult.tbHeight);
          console.assert(
            typeof imageUrl == 'string' && !isNaN(width) && !isNaN(height),
            'Unexpected respose from the Google Image Search API!');
            callback(imageUrl, width, height);
          };
          x.onerror = function() {
            errorCallback('Network error.');
          };
          x.send();
    }
