document.addEventListener('DOMContentLoaded', async function() {
    const generateTestButton = document.getElementById('generateTest');
    const copyButton = document.getElementById('copyToClipboard');
    const testCasesArea = document.getElementById('testCasesArea');
    const toggleSwitch = document.getElementById('extensionToggle');
    const statusDiv = document.querySelector('.status');

    // Function to update UI based on extension state
    function updateUI(enabled) {
        // Update buttons
        generateTestButton.disabled = !enabled;
        copyButton.disabled = !enabled;
        toggleSwitch.checked = enabled;

        // Update status
        statusDiv.innerHTML = enabled ? 
            `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>Extension is active and running` :
            `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>Extension is disabled`;
        statusDiv.style.backgroundColor = enabled ? '#E8F5E9' : '#FFEBEE';
        statusDiv.style.color = enabled ? '#2E7D32' : '#D32F2F';

        // Update buttons appearance
        generateTestButton.className = `button ${enabled ? 'button-primary' : 'button-disabled'}`;
        copyButton.className = `button ${enabled ? 'button-secondary' : 'button-disabled'}`;

        // Update textarea
        testCasesArea.disabled = !enabled;
        testCasesArea.placeholder = enabled ?
            "No test cases generated yet. Click 'Generate Test' to analyze all interactive elements on the page. If no results appear, try refreshing the page and ensuring you're not on a restricted site (like chrome:// pages)." :
            "Extension is disabled. Enable it using the toggle switch above to generate test cases.";
    }

    // Add styles for disabled state
    const style = document.createElement('style');
    style.textContent = `
        .button-disabled {
            background-color: #E0E0E0 !important;
            color: #9E9E9E !important;
            cursor: not-allowed !important;
            box-shadow: none !important;
        }
        .button-disabled:hover {
            transform: none !important;
            box-shadow: none !important;
        }
        .test-cases-area:disabled {
            background-color: #F5F5F5;
            color: #9E9E9E;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);

    // Load initial state
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            statusDiv.innerHTML = `
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Extension cannot run on this page
            `;
            statusDiv.style.backgroundColor = '#FFEBEE';
            statusDiv.style.color = '#D32F2F';
            updateUI(false);
            return;
        }

        const result = await chrome.storage.local.get(['enabled']);
        const enabled = result.enabled !== false;
        updateUI(enabled);

        // Check if content script is loaded
        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        } catch (error) {
            if (enabled) {
                // Inject content script if it's not loaded and extension is enabled
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                updateUI(true);
            }
        }
    } catch (error) {
        console.error('Error initializing popup:', error);
        statusDiv.textContent = 'Error: Could not initialize extension';
        statusDiv.style.color = '#f44336';
        statusDiv.style.backgroundColor = '#ffebee';
    }

    // Handle toggle changes
    toggleSwitch.addEventListener('change', async function() {
        const enabled = this.checked;
        try {
            await chrome.storage.local.set({ enabled });
            updateUI(enabled);

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                if (enabled) {
                    // Inject content script if enabling
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                }
                // Notify content script
                await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension', enabled });
            }
        } catch (error) {
            console.error('Error toggling extension:', error);
            statusDiv.textContent = 'Error: Could not update extension state';
            statusDiv.style.color = '#f44336';
            statusDiv.style.backgroundColor = '#ffebee';
        }
    });

    async function updateExtensionState(enabled) {
        try {
            await chrome.storage.local.set({ enabled: enabled });
            
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                if (enabled) {
                    // If enabling, make sure content script is injected
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                }
                // Notify content script about the state change
                await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension', enabled: enabled });
            }
            
            // Update UI
            statusDiv.textContent = enabled ? '✓ Extension is active and running' : '✗ Extension is disabled';
            statusDiv.style.color = enabled ? '#4CAF50' : '#f44336';
            generateTestButton.disabled = !enabled;
            copyButton.disabled = !enabled;

            if (enabled) {
                // Recheck status after a short delay
                setTimeout(checkExtensionStatus, 500);
            }
        } catch (error) {
            console.error('Error updating extension state:', error);
            statusDiv.textContent = 'Error: Could not update extension state';
            statusDiv.style.color = '#f44336';
        }
    }

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
                updateUI(true);
                return true;
            }
            updateUI(false);
            return false;
        } catch (error) {
            console.error('Extension status check failed:', error);
            updateUI(false);
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
                const formattedTestCases = response.testCases.map((tc, index) => {
                    return `${index + 1}. Element: ${tc.element}\n\nTest Cases:\n${tc.testCases.map(testCase => {
                        return `\n${testCase.title}:\n${testCase.steps.map(step => `  ${step}`).join('\n')}`;
                    }).join('\n')}`;
                }).join('\n\n' + '-'.repeat(50) + '\n\n');
                const summary = `Found ${response.testCases.length} interactive elements\n${'='.repeat(40)}\n\n`;
                testCasesArea.value = summary + formattedTestCases;
            } else {
                testCasesArea.value = 'No interactive elements found on the page. The extension works best on pages with buttons, forms, links and other interactive elements.';
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
