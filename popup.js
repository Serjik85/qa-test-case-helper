document.addEventListener('DOMContentLoaded', function() {
    const generateTestButton = document.getElementById('generateTest');
    const copyButton = document.getElementById('copyToClipboard');
    const testCasesArea = document.getElementById('testCasesArea');

    generateTestButton.addEventListener('click', async () => {
        try {
            // Show loading state
            generateTestButton.textContent = 'Generating...';
            generateTestButton.disabled = true;
            testCasesArea.value = 'Analyzing page elements...';

            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Send message to content script
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'getAllTestCases' }, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });

            // Handle the response
            if (response && response.testCases && response.testCases.length > 0) {
                testCasesArea.value = response.testCases.join('\n\n');
            } else {
                testCasesArea.value = 'No test cases found. Try hovering over elements on the page to see available test cases.';
            }
        } catch (error) {
            console.error('Error generating test cases:', error);
            testCasesArea.value = 'Error generating test cases. Please refresh the page and try again.';
        } finally {
            // Reset button state
            generateTestButton.textContent = 'Generate Test';
            generateTestButton.disabled = false;
        }
    });

    copyButton.addEventListener('click', () => {
        if (!testCasesArea.value.trim()) {
            return;
        }

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
