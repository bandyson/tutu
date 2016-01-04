// Content script
var poller = window.setInterval(function() {
    // TODO: how you gonna call this?
    if (document.documentElement.getAttribute('extensionCalled')) {
        chrome.extension.sendMessage({"anyname": "anything"}, function() {
            // TODO: callback function?
            console.log('chrome extension called');
        });
        clearInterval(poller);
    }
}, 200);
