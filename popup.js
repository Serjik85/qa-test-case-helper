document.addEventListener('DOMContentLoaded', function() {
    const generateTestButton = document.getElementById('generateTest');
    const copyButton = document.getElementById('copyToClipboard');
    const testCasesArea = document.getElementById('testCasesArea');
    const statusDiv = document.createElement('div');
    statusDiv.style.padding = '10px';
    statusDiv.style.marginTop = '10px';
    document.body.appendChild(statusDiv);

    // Check if extension is properly loaded
    async function checkExtensionStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Try to ping the content script
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'ping' }, response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response && response.status === 'ok') {
                statusDiv.textContent = '✓ Extension is active and running';
                statusDiv.style.color = '#4CAF50';
                return true;
            }
        } catch (error) {
            console.error('Extension status check failed:', error);
            statusDiv.textContent = '⚠️ Extension not properly loaded. Please refresh the page.';
            statusDiv.style.color = '#f44336';
            return false;
        }
    }

    generateTestButton.addEventListener('click', async () => {
        try {
            // Check extension status first
            const isActive = await checkExtensionStatus();
            if (!isActive) {
                throw new Error('Extension not properly loaded');
            }

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
            testCasesArea.value = `Error: ${error.message}\nPlease refresh the page and try again.`;
            statusDiv.textContent = '⚠️ Error occurred. Check console for details.';
            statusDiv.style.color = '#f44336';
        } finally {
            // Reset button state
            generateTestButton.textContent = 'Generate Test';
            generateTestButton.disabled = false;
        }
    });

    // Check extension status when popup opens
    checkExtensionStatus();

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
