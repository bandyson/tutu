function getJob() {
    console.log('getJob()');

    var jobNumberInput = document.getElementById('input-job-number');
    var jobNumber = jobNumberInput.value;
    console.log('jobNumber: ' + jobNumber);
    if (jobNumber) {
        chrome.extension.sendMessage({"jobNumber": jobNumber}, function() {
            console.log('content script callback called');
            // TODO: do you want to do anything here? close the popup?
        });

        // TODO: close the popup?
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // call get job when the button is clicked
    document.getElementById('btn-get-job').onclick = getJob;
});
