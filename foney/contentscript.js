// Content script
var poller = window.setInterval(function() {

    if (document.documentElement.getAttribute('extensionCalled')) {
        chrome.extension.sendMessage({"anyname": "anything"}, function() {
            // TODO: callback function?
            console.log('content script callback called');
        });
        clearInterval(poller);
    }

}, 200);
