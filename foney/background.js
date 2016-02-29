var baseUrl = 'https://fonekingdemo.vendhq.com';

// Background
chrome.extension.onMessage.addListener(function(request, sender, callback) {

    if (request.jobNumber) {

        createAndOpenSale(request.jobNumber);

        callback();
    }
});


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
        createAndOpenSale(text);
    });


function createAndOpenSale(jobNumber) {

    console.log('createAndOpenSale for job: ' + jobNumber);

    getJob(jobNumber, function (job) {
        console.log('getJob callback');
        console.log(job);

        if (!job) {
            console.log('No job retrieved');
            return;
        }

        getVendUser(function(userId) {

            // TODO: check a sale doesn't already exist with the job

            // get the vend products for the parts used
            var partSkus = job.parts;
            var products = [];

            asyncLoop(partSkus.length, function(loop) {
                    var sku = partSkus[loop.iteration()];
                    console.log('sku: ' + sku);

                    getVendProduct(sku, function(product) {

                        console.log(loop.iteration());
                        console.log(product);
                        if (product) {
                            products.push(product);
                        }

                        loop.next();
                    }, function (errorMessage) {
                        console.log('getVendProduct error. message: ' + errorMessage);
                    })},
                function() {
                    console.log('product loop ended')
                }
            );

            var customer = getCustomerFromJob(job);

            postCustomer(customer, function (customerId) {

                var sale = createSale(job, products, customerId, userId);

                postSale(sale, function (saleId) {
                    console.log('postSale callback');
                    console.log('saleId: ' + saleId);

                    // take me to Vend! open the sale in current tab
                    var deepLink = '/sell#sale/';
                    var fullDeepLink = baseUrl + deepLink + saleId;
                    console.log(fullDeepLink);

                    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                        console.log('chrome.tabs.query callback()');
                        console.log(tabs);

                        if (tabs == null || tabs.length == 0) {
                            alert('Error - could not get active tab in browser');
                            return;
                        }

                        var tabId = tabs[0].id;
                        chrome.tabs.update(tabId, {url: fullDeepLink});
                    })
                }, function (errorMessage) {
                    console.log('postSale error. message: ' + errorMessage);
                });
            }, function (errorMessage) {
                // TODO: call handleVendApiError()
                console.log('postSale error. message: ' + errorMessage);
            });

        }, function (errorMessage) {
            console.log('getVendUser error. message: ' + errorMessage);
        });
    }, function(errorMessage) {
        console.log('getJob error. message: ' + errorMessage);
    });

}

function getJob(jobNumber, callback, errorCallback) {
    console.log('getJob(). jobNumber: ' + jobNumber);

    // call Repair CMS for the job details

    /*
        job numbers
     QVB36357-1
     view-source:http://foneking.repaircms.com.au/index.php/getprice/QVB36357-1
     Qvb67877-1
     view-source:http://foneking.repaircms.com.au/index.php/getprice/Qvb67877-1
     Repairhq68407-1
     view-source:http://foneking.repaircms.com.au/index.php/getprice/Repairhq68407-1
     Miranda68493-1
     view-source:http://foneking.repaircms.com.au/index.php/getprice/Miranda68493-1

     Jobs with parts:
     REPAIRHQ70654-1
     view-source:http://foneking.repaircms.com.au/index.php/getprice/REPAIRHQ70654-1
     REPAIRHQ70656-1
     view-source:http://foneking.repaircms.com.au/index.php/getprice/REPAIRHQ70656-1
     REPAIRHQ70658-1
     view-source:http://foneking.repaircms.com.au/index.php/getprice/REPAIRHQ70658-1
     */

    // TODO: use config parameter %repair_cms_base_url%
    var foneKingBaseUrl = 'http://foneking.repaircms.com.au/index.php/getprice/';
    var url = foneKingBaseUrl + jobNumber;

    var x = new XMLHttpRequest();
    x.open('GET', url);
    x.responseType = 'document';

    x.onload = function () {
        var response = x.response;

        // still get a 200 status for a non-existent job

        // get the fields from html
        var nodes = response.body.childNodes;

        var first = nodes[0].data.trim();
        if ("** Invalid job refno" === first) {
            alert("Invalid job number: " + jobNumber);
            return;
        }

        var customer            = nodes[0].data.trim();
        // TODO: will there be null customers? what about companies etc?
        var splitCustomer = customer.split(',');
        var lastName = splitCustomer[0].trim();
        var firstName = splitCustomer[1] ? splitCustomer[1].trim() : "";

        var customerEmail       = nodes[2].data.trim();
        var customerMobile      = nodes[4].data.trim();
        var imei                = nodes[6].data.trim();
        // device name + capacity + colour - do you want to split them?
        var device              = nodes[8].data.trim();
        var symptoms            = nodes[10].data.trim();
        // how should these be split? parts separated by a comma?
        var parts               = nodes[12].data.trim();
        if (parts) {
            parts = parts.split(",");
        }

        // var price            = nodes[12].data.trim();
        var price               = nodes[14].data.trim();

        // translate the job to json
        var job = {
            "jobNumber": jobNumber,
            "customer": customer,
            "firstName": firstName,
            "lastName": lastName,
            "customerEmail": customerEmail,
            "customerMobile": customerMobile,
            "imeiSerial": imei,
            "device": device,
            "symptoms": symptoms,
            "parts": parts,
            "price": price
        };

        callback(job);
    };

    x.onerror = function () {
        errorCallback('Network error.');
    };

    x.send();
}

function createSale(job, products, customerId, userId) {

    var saleDate = new Date();
    saleDate = saleDate.getUTCFullYear() + "-" + (saleDate.getUTCMonth() + 1) + "-" + saleDate.getUTCDate() + " " +
        saleDate.getUTCHours() + ":" + (saleDate.getUTCMinutes() - 1) + ":" + saleDate.getUTCSeconds();

    var d = new Date();
    var time = d.getUTCHours() + ":" + d.getUTCMinutes() + ":" + d.getUTCSeconds();

    var note = "Customer: " + job.customer;
    note += "\nCustomer email: " + job.customerEmail;
    note += "\nCustomer mobile: " + job.customerMobile;
    note += "\nIMEI/Serial: " + job.imeiSerial;
    note += "\nDevice: " + job.device;
    note += "\nSymptoms: " + job.symptoms;
    note += "\nParts: " + job.parts;
    note += "\nPrice: " + job.price;

    var taxExclPrice = job.price / 1.1;
    taxExclPrice = Math.round(taxExclPrice * 100) / 100;
    var taxAmount = job.price / 11;
    taxAmount = Math.round(taxAmount * 100) / 100;

    var lineItems = [];
    var priceLineItem = {
        // place holder product to store the job cost against - TODO: get from config
        "product_id": "0a9f6f41-075f-11e5-fbe7-9662a33b2815",
        "unit_price": taxExclPrice,
        "quantity": 1,
        "price_set": false,
        "tax_components": [
            {
                //  GST
                "rate_id": "c1423fed-8136-11e5-9ed9-31eb0866e756",
                "total_tax": taxAmount
            }
        ],
        "sequence": 0,
        "status": "CONFIRMED"
    };
    lineItems.push(priceLineItem);

    for (var i = 0; i < products.length; i++) {
        var product = products[i];

        var lineItem = {
            "product_id": product.id,
            "unit_price": 0, // TODO: get the price from the object
            "quantity": 1, // TODO: what does it look like if you have more than one of the part?
            "price_set": false,
            "tax_components": [
                {
                    //  GST
                    "rate_id": "c1423fed-8136-11e5-9ed9-31eb0866e756",
                    "total_tax": taxAmount
                }
            ],
            "sequence": i + 1,
            "status": "CONFIRMED"
        };

        lineItems.push(lineItem);
    }

    return {
        // "receipt_number": job.jobNumber,
        "receipt_number": time,
        // TODO: use config param for register id
        "register_id": "31eb0866-e756-11e5-fed9-8136c14c4177",
        "sale_date": saleDate,
        "customer_id": customerId,
        "user_id": userId,
        "total_price": taxExclPrice,
        "total_tax": taxAmount,
        "tax_name": "GST",
        "status": "SAVED",
        "note": note,
        "line_items": lineItems
    };
}

function createZeroSale() {

    var sale =
    {
        "id": "ea760626-c201-9e65-11e5-97fa544727d0",
        "short_code": "hci7my",
        "sale_date": "2015-12-01T20:08:50+13:00",
        "status": "CLOSED",
        "customer_id": null,
        "register_id": "47fe23b6-28f0-11e5-f4e4-785e4b8240a3",
        "user_id": "bc305bf6-6130-11e4-f15a-1c17bd513036",
        "invoice_number": "4",
        "invoice_sequence": 4,
        "total_tax": "150.00000",
        "total_price": "1000.00000",
        "note": "",
        "receipt_address": "",
        "register_sale_products": [{
            "id": "ea760626-c201-9e65-11e5-97fa5632cb33",
            "product_id": "b8ca3a6e-72f0-11e4-efc6-ace0c113b66a",
            "price": 1000,
            "price_set": 0,
            "discount": 0,
            "tax": "150.00000",
            "tax_id": "bc305bf6-6130-11e4-f15a-1c17bd3ae38b",
            "loyalty_value": "20.00000",
            "quantity": "1",
            "sequence": 0,
            "status": "SAVED",
            "attributes": [{
                "name": "line_note",
                "value": ""
            }]
        }],
        "register_sale_payments": [{
            "id": "ea760626-c201-9e65-11e5-97fa5f468e04",
            "register_id": "47fe23b6-28f0-11e5-f4e4-785e4b8240a3",
            "payment_type_id": 1,
            "retailer_payment_type_id": "bc305bf6-6130-11e4-f15a-1c17bd49fc43",
            "payment_date": "2015-12-01T20:08:50+13:00",
            "amount": 1150
        }]
    }
}

function getCustomerFromJob(job) {
    return {
        "first_name": job.firstName,
        "last_name": job.lastName,
        "note": job.jobNumber
    };
}

function postSale(sale, callback, errorCallback) {
    console.log('postSale()');
    console.log(sale);

    var url = baseUrl + '/api/2.0/sales';

    var x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('Content-Type', 'application/json');
    x.responseType = 'json';

    x.onload = function () {
        console.log('Sale posted to Vend. Status: ' + x.status);
        var response = x.response;
        console.log(response);
        if (201 != x.status) {
            console.log('Error posting sale.');
            handleVendApiError(response);
            // TODO: call the errorCallback?
            return;
        }

        var saleId = response.data.id;
        callback(saleId);
    };

    x.onerror = function () {
        errorCallback('Network error.');
    };

    x.send(JSON.stringify(sale));
}

function postCustomer(customer, callback, errorCallback) {
    console.log('createVendCustomer()');

    var url = baseUrl + '/api/2.0/customers';

    var x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('Content-Type', 'application/json');
    x.responseType = 'json';

    x.onload = function () {
        console.log('Customer posted to Vend. Status: ' + x.status);
        var response = x.response;
        console.log(response);
        if (201 != x.status) {
            console.log('Error posting customer.');
            handleVendApiError(response);
            return;
        }

        var customerId = response.data.id;
        callback(customerId);
    };

    x.onerror = function () {
        errorCallback('Network error: ' + url);
    };

    x.send(JSON.stringify(customer));
}

function getVendUser(callback, errorCallback) {
    console.log('getVendUser()');

    var url = baseUrl + '/api/2.0/user';

    var x = new XMLHttpRequest();
    x.open('GET', url);
    x.responseType = 'json';

    x.onload = function () {
        console.log('getVendUser returned. Status: ' + x.status);
        var response = x.response;
        console.log(response);
        if (200 != x.status) {
            console.log('Error getting Vend user.');
            handleVendApiError(response);
            return;
        }

        var userId = response.data.id;
        callback(userId);
    };

    x.onerror = function () {
        errorCallback('Network error: ' + url);
    };

    x.send();
}

function getVendProduct(sku, callback, errorCallback) {
    console.log('getProduct()');

    var url = baseUrl + '/api/products?sku=' + sku;

    var x = new XMLHttpRequest();
    x.open('GET', url);
    x.responseType = 'json';

    x.onload = function () {
        console.log('getProduct returned. Status: ' + x.status);
        var response = x.response;
        console.log(response);
        if (200 != x.status) {
            console.log('Error getting product: ' + sku);
            handleVendApiError(response);
            return;
        }

        // TODO: check there is actually data in there

        var product = response.products[0];
        callback(product);
    };

    x.onerror = function () {
        errorCallback('Network error: ' + url);
    };

    x.send();
}

function handleVendApiError(response) {
    var error = response.error;

    if (error != null) {
        if ("Access token is missing" === error) {
            alert('You must be logged into Vend');
            // TODO: open vend in current tab
        } else {
            alert(error);
        }
    }

    var errors = response.errors.global;
    var message = '';
    for (var i = 0; i < errors.length; i++) {
        error = errors[i];
        message += error + '\n';
        console.log(error);
    }

    alert(message);
}

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;

    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);
            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };

    loop.next();
    return loop;
}
