document.addEventListener('DOMContentLoaded', async function () {
    // ── Element refs ─────────────────────────────────────────────────────────
    const generateBtn    = document.getElementById('generateTest');
    const genSpinner     = document.getElementById('genSpinner');
    const genBtnText     = document.getElementById('genBtnText');
    const copyBtn        = document.getElementById('copyToClipboard');
    const exportMdBtn    = document.getElementById('exportMarkdown');
    const clearBtn       = document.getElementById('clearBtn');
    const testCasesArea  = document.getElementById('testCasesArea');
    const toggleSwitch   = document.getElementById('extensionToggle');
    const toggleLabel    = document.getElementById('toggleLabel');
    const statusDiv      = document.getElementById('statusDiv');
    const statusText     = document.getElementById('statusText');
    const themeToggle    = document.getElementById('themeToggle');
    const themeIcon      = document.getElementById('themeIcon');
    const statsBar       = document.getElementById('statsBar');
    const statTotal      = document.getElementById('statTotal');
    const truncWarn      = document.getElementById('truncationWarning');
    const truncText      = document.getElementById('truncationText');

    // ── State ─────────────────────────────────────────────────────────────────
    let allGeneratedText = '';
    let currentFilter    = 'all';
    let isDark           = false;
    let generatedData    = null; // raw response from content script

    // ── Dark mode ─────────────────────────────────────────────────────────────
    const SUN_SVG  = '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2v-2H2v2zm18 0h2v-2h-2v2zM11 2v2h2V2h-2zm0 18v2h2v-2h-2zM5.99 4.58L4.58 5.99l1.41 1.41 1.41-1.41-1.41-1.41zm12.02 12.02-1.41 1.41 1.41 1.41 1.41-1.41-1.41-1.41zM18.01 4.58l-1.41 1.41 1.41 1.41 1.41-1.41-1.41-1.41zM5.99 18.01l-1.41 1.41 1.41 1.41 1.41-1.41-1.41-1.41z"/>';
    const MOON_SVG = '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';

    async function loadTheme() {
        const { theme } = await chrome.storage.local.get(['theme']);
        applyTheme(theme === 'dark');
    }

    function applyTheme(dark) {
        isDark = dark;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
        themeIcon.innerHTML = dark ? SUN_SVG : MOON_SVG;
        themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }

    themeToggle.addEventListener('click', async () => {
        applyTheme(!isDark);
        await chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
    });

    await loadTheme();

    // ── Tab switching ─────────────────────────────────────────────────────────
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // ── Filter chips ──────────────────────────────────────────────────────────
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            applyFilter();
        });
    });

    function applyFilter() {
        if (!generatedData || !generatedData.testCases) return;

        let filtered = generatedData.testCases;
        if (currentFilter !== 'all') {
            filtered = generatedData.testCases.filter(tc =>
                tc.element.toLowerCase().startsWith(currentFilter)
            );
        }

        if (filtered.length === 0) {
            testCasesArea.value = `No "${currentFilter}" elements found on this page.`;
            updateStats(0, generatedData.total, generatedData.truncated);
            return;
        }

        testCasesArea.value = formatTestCases(filtered);
        updateStats(filtered.length, generatedData.total, generatedData.truncated);
    }

    function formatTestCases(testCases) {
        const summary = `Found ${testCases.length} element(s)\n${'═'.repeat(38)}\n\n`;
        const body = testCases.map((tc, i) =>
            `${i + 1}. ${tc.element}\n\n` +
            tc.testCases.map(c =>
                `  ▸ ${c.title}\n` +
                c.steps.map(s => `    ${s}`).join('\n')
            ).join('\n\n')
        ).join('\n\n' + '─'.repeat(46) + '\n\n');
        return summary + body;
    }

    function formatTestCasesAsMarkdown(testCases) {
        const lines = [`# QA Test Cases\n\nGenerated: ${new Date().toLocaleString()}\n`];
        testCases.forEach((tc, i) => {
            lines.push(`\n## ${i + 1}. \`${tc.element}\``);
            tc.testCases.forEach(c => {
                lines.push(`\n### ${c.title}`);
                c.steps.forEach(s => lines.push(`- ${s}`));
            });
        });
        return lines.join('\n');
    }

    function updateStats(shown, total, truncated) {
        statsBar.style.display = 'flex';
        statTotal.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>${shown} element${shown !== 1 ? 's' : ''}`;
        if (truncated) {
            truncText.textContent = `Large page: showing first 200 of ${total} elements`;
            truncWarn.classList.add('visible');
        } else {
            truncWarn.classList.remove('visible');
        }
    }

    // ── Status helpers ────────────────────────────────────────────────────────
    function setStatus(type, text, loading = false) {
        const icons = {
            ok:      '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
            error:   '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>',
            warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
        };
        statusDiv.className = `status ${type}`;
        statusDiv.innerHTML = `<svg viewBox="0 0 24 24">${icons[type] || icons.ok}</svg><span>${text}${loading ? '<span class="dots"></span>' : ''}</span>`;
    }

    // ── updateUI ──────────────────────────────────────────────────────────────
    function updateUI(enabled) {
        toggleSwitch.checked = enabled;
        toggleLabel.textContent = enabled ? 'ON' : 'OFF';
        generateBtn.disabled   = !enabled;
        copyBtn.disabled       = !enabled;
        exportMdBtn.disabled   = !enabled;
        clearBtn.disabled      = !enabled;
        testCasesArea.disabled = !enabled;
        testCasesArea.placeholder = enabled
            ? "No test cases generated yet.\n\nClick 'Generate Test Cases' to analyze all interactive elements on the page, or hover over elements to see individual suggestions.\n\nTip: if no results appear, try refreshing the page."
            : 'Extension is disabled. Use the toggle to re-enable it.';

        if (!enabled) {
            setStatus('error', 'Extension is disabled');
        }
    }

    // ── Initialise ────────────────────────────────────────────────────────────
    async function init() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab found');

            const url = tab.url || '';
            if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
                setStatus('warning', 'Extension cannot run on this page');
                updateUI(false);
                return;
            }

            const { enabled } = await chrome.storage.local.get(['enabled']);
            const isEnabled = enabled !== false;

            // Ping with timeout
            try {
                await pingContentScript(tab.id);
                updateUI(isEnabled);
                if (isEnabled) setStatus('ok', 'Extension active — hover elements or click Generate');
            } catch {
                if (isEnabled) {
                    try {
                        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
                        updateUI(true);
                        setStatus('ok', 'Extension active — hover elements or click Generate');
                    } catch {
                        setStatus('error', 'Could not inject content script — try refreshing the page');
                        updateUI(false);
                    }
                } else {
                    updateUI(false);
                }
            }
        } catch (err) {
            setStatus('error', err.message || 'Initialisation error');
        }
    }

    function pingContentScript(tabId) {
        return Promise.race([
            new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, { action: 'ping' }, res => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(res);
                });
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ]);
    }

    await init();

    // ── Toggle ────────────────────────────────────────────────────────────────
    toggleSwitch.addEventListener('change', async function () {
        const enabled = this.checked;
        try {
            await chrome.storage.local.set({ enabled });
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab');
            const url = tab.url || '';
            if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) throw new Error('Cannot run on this page');

            if (enabled) {
                try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch {}
            }
            updateUI(enabled);
            if (enabled) setStatus('ok', 'Extension active — hover elements or click Generate');
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension', enabled });
            } catch {
                if (enabled) {
                    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
                    await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension', enabled });
                }
            }
        } catch (err) {
            this.checked = !enabled;
            updateUI(!enabled);
            setStatus('error', err.message || 'Toggle error');
        }
    });

    // ── Generate ──────────────────────────────────────────────────────────────
    generateBtn.addEventListener('click', async () => {
        try {
            // Loading state
            generateBtn.disabled = true;
            genSpinner.style.display = 'block';
            genBtnText.textContent = 'Generating';
            setStatus('ok', 'Analysing page elements', true);
            testCasesArea.value = '';
            statsBar.style.display = 'none';
            truncWarn.classList.remove('visible');

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab');

            // Ensure content script is live
            try { await pingContentScript(tab.id); } catch {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            }

            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'getAllTestCases' }, res => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(res);
                });
            });

            if (response && response.testCases && response.testCases.length > 0) {
                generatedData = response;
                currentFilter = 'all';
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
                applyFilter();
                setStatus('ok', `Generated test cases for ${response.testCases.length} element(s)`);
            } else {
                testCasesArea.value = 'No interactive elements found on this page.\n\nThe extension works best on pages with buttons, forms, links and other interactive elements.';
                setStatus('warning', 'No interactive elements found');
            }
        } catch (err) {
            console.error('Generate error:', err);
            testCasesArea.value = `Error: ${err.message}\n\nPlease refresh the page and try again.`;
            setStatus('error', err.message || 'Error generating test cases');
        } finally {
            generateBtn.disabled = false;
            genSpinner.style.display = 'none';
            genBtnText.textContent = 'Generate Test Cases';
        }
    });

    // ── Copy ──────────────────────────────────────────────────────────────────
    copyBtn.addEventListener('click', async () => {
        const text = testCasesArea.value.trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Copied!`;
            setTimeout(() => { copyBtn.innerHTML = orig; }, 1500);
        } catch {
            // Fallback
            testCasesArea.select();
            document.execCommand('copy');
        }
    });

    // ── Export Markdown ───────────────────────────────────────────────────────
    exportMdBtn.addEventListener('click', async () => {
        if (!generatedData || !generatedData.testCases) return;

        let data = generatedData.testCases;
        if (currentFilter !== 'all') {
            data = data.filter(tc => tc.element.toLowerCase().startsWith(currentFilter));
        }

        const md = formatTestCasesAsMarkdown(data);
        try {
            await navigator.clipboard.writeText(md);
            const orig = exportMdBtn.innerHTML;
            exportMdBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Copied!`;
            setTimeout(() => { exportMdBtn.innerHTML = orig; }, 1500);
        } catch (err) {
            console.error('Export error:', err);
        }
    });

    // ── Clear ─────────────────────────────────────────────────────────────────
    clearBtn.addEventListener('click', () => {
        testCasesArea.value = '';
        generatedData = null;
        statsBar.style.display = 'none';
        truncWarn.classList.remove('visible');
        currentFilter = 'all';
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    });
});
