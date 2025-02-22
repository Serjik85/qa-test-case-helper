document.addEventListener('DOMContentLoaded', function() {
    const generateTestButton = document.getElementById('generateTest');
    const copyButton = document.getElementById('copyToClipboard');
    const testCasesArea = document.getElementById('testCasesArea');

    generateTestButton.addEventListener('click', async () => {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to content script to get all test cases
        chrome.tabs.sendMessage(tab.id, { action: "getAllTestCases" }, response => {
            if (response && response.testCases) {
                testCasesArea.value = response.testCases.join('\n');
            }
        });
    });

    copyButton.addEventListener('click', () => {
        testCasesArea.select();
        document.execCommand('copy');
        
        // Visual feedback
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 1500);
    });
});
