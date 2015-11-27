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

        getJob(text, function (job) {
            console.log('getJob callback');
            console.log(job);

            var sale = createSale(job);

            postSale(sale, function (saleId) {
                console.log('postSale callback');
                console.log('saleId: ' + sale);

                var baseUrl = 'https://fonekingdemo.vendhq.com';
                var deepLink = '/sell#sale/';
                var fullDeepLink = baseUrl + deepLink + saleId;
                console.log(fullDeepLink);

                // take me to Vend!
                chrome.tabs.query({"currentWindow": true}, function (tabs) {
                    console.log('chrome.tabs.query callback()');
                    console.log(tabs);

                    // TODO: figure out the current tab
                    var tabId = tabs[1].id;

                    chrome.tabs.update(tabId, {url: fullDeepLink});
                })

            }, function (errorMessage) {
                console.log('postSale error. message: ' + errorMessage);
            });
        }, function(errorMessage) {
            console.log('getJob error. message: ' + errorMessage);
        });
    });

function getJob(jobNumber, callback, errorCallback) {
    console.log('getJob(). jobNumber: ' + jobNumber);

    // call Repair CMS for the job details
    // TODO: remove
    jobNumber = 'QVB36357-1';

    // TODO: use config parameter %repair_cms_base_url%
    var baseUrl = 'http://foneking.repaircms.com.au/index.php/getprice/';
    var url = baseUrl + jobNumber;

    var x = new XMLHttpRequest();
    x.open('GET', url);
    x.responseType = 'document';

    x.onload = function () {
        var response = x.response;

        // TODO: does it 404 for a non-existent job? or check
        if (200 != x.status) {
            // todo: what do you want to do? what situations cause this?
        }

        // get the fields from html
        var nodes = response.body.childNodes;

        // TODO: split the name
        var customer            = nodes[0].data.trim();
        var customerEmail       = nodes[2].data.trim();
        var customerMobile      = nodes[4].data.trim();
        var imei                = nodes[6].data.trim();
        // device name + capacity + colour - do you want to split them?
        var device              = nodes[8].data.trim();
        var symptoms            = nodes[10].data.trim();
        // how should these be split?
        var partsAndServices    = nodes[10].data.trim();
        // var price               = nodes[12].data.trim();
        var price               = nodes[14].data.trim();

        // translate the job to json
        var job = {
            "jobNumber": jobNumber,
            "customer": customer,
            "customerEmail": customerEmail,
            "customerMobile": customerMobile,
            "IMEISerial": imei,
            "device": device,
            "symptoms": symptoms,
            "partsService": partsAndServices,
            "price": price
        };

        callback(job);
    };

    x.onerror = function () {
        errorCallback('Network error.');
    };

    x.send();
}

function createSale(job) {

    var saleDate = new Date();
    saleDate = saleDate.getUTCFullYear() + "-" + saleDate.getUTCMonth() + "-" + saleDate.getUTCDate() + " " +
        saleDate.getUTCHours() + ":" + saleDate.getUTCMinutes() + ":" + saleDate.getUTCSeconds();

    var d = new Date();
    var time = d.getUTCHours() + ":" + d.getUTCMinutes() + ":" + d.getUTCSeconds();

    return {
        // "receipt_number": job.jobNumber,
        "receipt_number": time,
        // TODO: use config param for register id
        "register_id": "31eb0866-e756-11e5-fed9-8136c14c4177",
        "sale_date": saleDate,
        // TODO: get this from the api
        "user_id": "31eb0866-e756-11e5-fed9-8136c14db57d",
        "total_price": job.price,
        // TODO: are we charging gst?
        "total_tax": 0,
        "tax_name": "No Tax",
        "status": "SAVED",
        // TODO: what is going to go in the note?
        "note": null,
        "line_items": [
            {
                // APPLE IPHONE 30 PIN DATA CABLE
                "product_id": "31eb0866-e75f-11e5-fed9-84e950e7626a",
                //  "unit_price": 100.00,
                "unit_price": 0,
                "quantity": 1,
                // TODO: what does this mean? true? i do want to set the price.
                "price_set": false,
                "tax_components": [
                    {
                        //  GST
                        "rate_id": "c1423fed-8136-11e5-9ed9-31eb0866e756",
                        "total_tax": 10

                        // No tax
                        /*
                        "rate_id": "31eb0866-e756-11e5-fed9-8136c130febf",
                        "total_tax": 0
                        */
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
    var url = baseUrl + '/api/2.0/sales';

    var x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('Content-Type', 'application/json');
    x.responseType = 'json';

    x.onload = function () {
        var response = x.response;
        // var response = this.response;

        console.log('Sale posted to Vend. Status: ' + x.status);
        console.log(response);
        if (201 != x.status) {
            console.log('Error posting sale.');
            // var errors = response.errors.global;
            // var x = 'yolo';
            // todo: what do you want to do? call the error? what situations cause this?
        }

        // TODO: what if you're not logged in?

        var saleId = response.data.id;

        // call the call back!
        callback(saleId);
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
    };

    x.onerror = function () {
        errorCallback('Network error.');
    };

    x.send();
}

function getVendUser(callback, errorCallback) {
    console.log('getVendUser()');

    // TODO: https://fonekingdemo.vendhq.com/api/2.0/user
}
