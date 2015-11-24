// This event is fired each time the user updates the text in the omnibox,
// as long as the extension's keyword mode is still active.
chrome.omnibox.onInputChanged.addListener(
    function (text, suggest) {
        console.log('inputChanged: ' + text);
        /*
         suggest([
         {content: text + " one", description: "the first one"},
         {content: text + " number two", description: "the second entry"}
         ]);
         */
    });

// This event is fired when the user accepts the input in the omnibox.
chrome.omnibox.onInputEntered.addListener(
    function (text) {
        console.log('inputEntered: ' + text);

        /*callVend(text, function() {
         console.log('callVend callback');
         }, function(errorMessage) {
         console.log('callVend error. message: ' + errorMessage);
         });*/

        var job = getJob(text, function (job) {
            console.log('getJob callback');
            console.log(job);
        }, function(errorMessage) {
            console.log('getJob error. message: ' + errorMessage);
        });

        // TODO: move inside the callback.
        var sale = createSale(job);

        postSale(sale, function () {
            console.log('postSale callback');
            console.log(sale);
        }, function (errorMessage) {
            console.log('postSale error. message: ' + errorMessage);
        });
    });

function getJob(jobNumber, callback, errorCallback) {
    console.log('getJob(). jobNumber: ' + jobNumber);

    // call Repair CMS for the job details
    jobNumber = 'QVB36357-1';

    // http://foneking.repaircms.com.au/index.php/getprice/QVB36357-1
    var baseUrl = 'http://foneking.repaircms.com.au/index.php/getprice/';
    var url = baseUrl + jobNumber;

    var x = new XMLHttpRequest();
    x.open('GET', url);
    // x.setRequestHeader('Content-Type', 'application/json');
    x.responseType = 'document';

    x.onload = function () {
        var response = x.response;
        var status = x.status;
        if (200 != x.status) {
            // todo: what do you want to do? what situations cause this?
        }

        var nodes = response.body.childNodes;
        var customer = nodes[0].data.trim();

        var notSure = nodes[2].data.trim();
        var phone = nodes[4].data.trim();
        console.log(customer);

        // TODO: does it 404 for a non-existent job?

        // translate the job to json

        var job = {
            "customer": customer,
            "phone": phone
        };

        callback(job);
    };

    x.onerror = function () {
        errorCallback('Network error.');
    };

    x.send();
}

function createSale(job) {
    // TODO: get a real job!
    return {
        "register_id": "31eb0866-e756-11e5-fed9-8136c14c4177",
        "sale_date": "2015-10-14 00:06:15", // TODO: will it default to now?
        "user_id": "31eb0866-e756-11e5-fed9-8136c14db57d",
        "total_price": 100.00,
        "total_tax": 10,
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
                // TODO: how will taxes be treated? GST?
                "tax_components": [
                    {
                        "rate_id": "c1423fed-8136-11e5-9ed9-31eb0866e756",
                        "total_tax": 10
                    }
                ],
                "sequence": 0,
                "note": "The line item note",
                "status": "CONFIRMED"
            }
        ]
    };
}

function postSale(sale, callback, errorCallback) {
    console.log('postSale()');
    console.log(sale);

    var baseUrl = 'https://fonekingdemo.vendhq.com';
    // var baseUrl = 'https://local-demo.dev.vendhq.localdomain/';
    var url = baseUrl + '/api/2.0/sales';

    var x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('Content-Type', 'application/json');
    x.responseType = 'json';

    x.onload = function () {
        var response = x.response;

        // TODO: check the status code

        var yolo = 'x';
        /*var data = response.data;
         for (i = 0; i < data.length; i++) {
         var product = data[i];
         console.log('Product: ' + product.name);
         }*/
    }

    x.onerror = function () {
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

    x.onload = function () {
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

    x.onerror = function () {
        errorCallback('Network error.');
    };

    x.send();
}
