// Global variables for tooltip state and elements
let tooltipContainer = null;
let tooltip = null;
let closeButton = null;
let copyButton = null;
let lockButton = null;
let isTooltipLocked = false;
let isTooltipHovered = false;
let currentElement = null;
let isEnabled = true; // Default to enabled

// Test case suggestions for different element types
const testCaseSuggestions = {
    // Default test cases for any interactive element
    default: [
        {
            title: "Basic interaction",
            steps: [
                "1. Verify element is visible and enabled",
                "2. Click on the element",
                "3. Verify the element responds to the interaction",
                "4. Verify any associated state changes or UI updates"
            ]
        },
        {
            title: "Keyboard accessibility",
            steps: [
                "1. Focus the element using Tab key",
                "2. Verify focus indicator is visible",
                "3. Activate element using Enter/Space key",
                "4. Verify the element responds to keyboard interaction"
            ]
        }
    ],
    button: [
        {
            title: "Button click functionality",
            steps: [
                "1. Locate the button element",
                "2. Verify button text/label is correct",
                "3. Click the button",
                "4. Verify expected action occurs",
                "5. Verify any state changes or UI updates"
            ]
        }
    ],
    input: [
        {
            title: "Valid input acceptance",
            steps: [
                "1. Locate the input field",
                "2. Enter valid data",
                "3. Verify input is accepted",
                "4. Verify any validation indicators"
            ]
        },
        {
            title: "Invalid input handling",
            steps: [
                "1. Locate the input field",
                "2. Enter invalid data",
                "3. Verify error message appears",
                "4. Verify input is marked as invalid"
            ]
        }
    ],
    select: [
        {
            title: "Option selection",
            steps: [
                "1. Click to open dropdown",
                "2. Verify all options are visible",
                "3. Select different options",
                "4. Verify selected option is displayed",
                "5. Verify any dependent UI updates"
            ]
        }
    ],
    link: [
        {
            title: "Link navigation",
            steps: [
                "1. Verify link text is descriptive",
                "2. Click the link",
                "3. Verify correct navigation occurs",
                "4. Test browser back navigation"
            ]
        }
    ],
    form: [
        {
            title: "Form submission",
            steps: [
                "1. Fill all required fields",
                "2. Submit the form",
                "3. Verify successful submission",
                "4. Verify form state after submission"
            ]
        },
        {
            title: "Form validation",
            steps: [
                "1. Submit empty form",
                "2. Verify validation messages",
                "3. Fill invalid data",
                "4. Verify error handling"
            ]
        }
    ]
};

// Initialize the extension
function initializeExtension() {
    try {
        // Remove any existing tooltip containers
        const existingContainer = document.querySelector('.qa-helper-tooltip-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create tooltip element with fixed positioning
        tooltipContainer = document.createElement('div');
        tooltipContainer.className = 'qa-helper-tooltip-container';
        document.body.appendChild(tooltipContainer);

        tooltip = document.createElement('div');
        tooltip.className = 'qa-helper-tooltip';
        tooltipContainer.appendChild(tooltip);

        // Add hover handlers to tooltip
        tooltipContainer.addEventListener('mouseenter', () => {
            isTooltipHovered = true;
        });

        tooltipContainer.addEventListener('mouseleave', () => {
            isTooltipHovered = false;
            if (!isTooltipLocked) {
                hideTooltip();
            }
        });

        // Create close button
        closeButton = document.createElement('button');
        closeButton.className = 'qa-helper-close-button';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('data-testid', 'qa-helper-close-button');
        closeButton.setAttribute('aria-label', 'Close test case tooltip');
        closeButton.title = 'Close test case tooltip';
        tooltip.appendChild(closeButton);

        return true;
    } catch (error) {
        console.error('Error initializing extension:', error);
        return false;
    }
}

// Function to get test cases for an element
function getTestCases(element) {
    if (!element) return null;

    let elementType = element.tagName.toLowerCase();
    if (element.type === 'submit' || element.role === 'button') {
        elementType = 'button';
    } else if (element.href || element.role === 'link') {
        elementType = 'link';
    }

    const testCases = [];
    
    // Add default test cases
    if (testCaseSuggestions.default) {
        testCases.push(...testCaseSuggestions.default);
    }

    // Add element-specific test cases
    if (testCaseSuggestions[elementType]) {
        testCases.push(...testCaseSuggestions[elementType]);
    }

    return testCases;
}

// Helper function to check if element is visible
function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0;
}

// Function to get element identifier
function getElementIdentifier(element) {
    if (!element) return '';

    const identifiers = [];

    // Check for ID
    if (element.id) {
        identifiers.push(`id="${element.id}"`);
    }

    // Check for name
    if (element.name) {
        identifiers.push(`name="${element.name}"`);
    }

    // Check for type
    if (element.type) {
        identifiers.push(`type="${element.type}"`);
    }

    // Check for role
    if (element.getAttribute('role')) {
        identifiers.push(`role="${element.getAttribute('role')}"`);
    }

    // Check for text content
    const textContent = element.textContent.trim();
    if (textContent) {
        identifiers.push(`text="${textContent}"`);
    }

    // Check for value
    if (element.value) {
        identifiers.push(`value="${element.value}"`);
    }

    // Check for placeholder
    if (element.placeholder) {
        identifiers.push(`placeholder="${element.placeholder}"`);
    }

    return identifiers.join(', ');
}

// Function to show tooltip
function showTooltip(element, testCases) {
    if (!element || !testCases || !tooltip) return;

    const elementIdentifier = getElementIdentifier(element);
    
    const testCasesHtml = testCases.map(tc => `
        <div class="test-case">
            <strong>• ${tc.title}</strong>
            <div class="steps">
                ${tc.steps.map(step => `<div class="step">${step}</div>`).join('')}
            </div>
        </div>
    `).join('');
    
    tooltip.innerHTML = `
        <div class="tooltip-content">
            <div class="tooltip-header">
                <strong>Element: ${element.tagName.toLowerCase()} ${elementIdentifier}</strong>
                <button class="qa-helper-copy-button" title="Copy test cases">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 0H6C4.89543 0 4 0.89543 4 2V4H2C0.89543 4 0 4.89543 0 6V14C0 15.1046 0.89543 16 2 16H9C10.1046 16 11 15.1046 11 14V12H13C14.1046 12 15 11.1046 15 10V2C15 0.89543 14.1046 0 13 0Z" fill="currentColor"/>
                    </svg>
                    Copy
                </button>
            </div>
            <div class="test-cases">
                ${testCasesHtml}
            </div>
        </div>
    `;

    // Position tooltip near the element
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltipContainer.getBoundingClientRect();
    
    // Try to position above the element first
    let top = rect.top - tooltipRect.height - 10;
    let isAbove = true;
    
    // If not enough space above, try below
    if (top < 10) {
        top = rect.bottom + 10;
        isAbove = false;
        
        // If not enough space below either, use the side with more space
        if (top + tooltipRect.height > window.innerHeight - 10) {
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceAbove > spaceBelow) {
                top = rect.top - tooltipRect.height - 10;
                isAbove = true;
            }
        }
    }
    
    // Center horizontally with the element
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    
    // Ensure tooltip stays within viewport horizontally
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    if (left < 10) left = 10;
    
    tooltipContainer.style.top = `${top}px`;
    tooltipContainer.style.left = `${left}px`;
    tooltipContainer.style.display = 'block';
    
    // Update arrow position class
    tooltipContainer.classList.toggle('tooltip-above', isAbove);
}

// Function to hide tooltip
function hideTooltip() {
    if (tooltipContainer) {
        tooltipContainer.style.display = 'none';
    }
}

// Function to format test cases for copying
function formatTestCasesForCopy(element) {
    if (!element) return '';

    const testCases = getTestCases(element);
    if (!testCases) return '';

    const elementIdentifier = getElementIdentifier(element);
    let formattedText = `Test Cases for ${element.tagName.toLowerCase()} ${elementIdentifier}\n\n`;

    testCases.forEach(tc => {
        formattedText += `${tc.title}:\n`;
        tc.steps.forEach(step => {
            formattedText += `${step}\n`;
        });
        formattedText += '\n';
    });

    return formattedText;
}

// Function to copy test cases
function copyTestCases(element, event) {
    const testCasesText = formatTestCasesForCopy(element);
    if (!testCasesText) return;

    navigator.clipboard.writeText(testCasesText).then(() => {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'qa-helper-copy-success';
        successMessage.textContent = 'Test cases copied!';
        successMessage.style.position = 'fixed';
        successMessage.style.left = `${event.clientX + 10}px`;
        successMessage.style.top = `${event.clientY - 20}px`;
        document.body.appendChild(successMessage);

        // Remove message after animation
        setTimeout(() => {
            successMessage.style.opacity = '0';
            setTimeout(() => successMessage.remove(), 300);
        }, 1000);
    });
}

// Function to handle mouse over events
function handleMouseOver(e) {
    if (!isEnabled || !tooltipContainer || !tooltip) return;
    
    // Don't process events if we're currently interacting with the tooltip
    if (isTooltipHovered && !isTooltipLocked) return;
    
    // Ignore elements inside our tooltip
    if (tooltipContainer.contains(e.target)) return;

    const interactiveElements = 'button, input, select, a, form, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], textarea';
    const target = e.target.closest(interactiveElements);
    
    // If we're already showing for this element, don't reset
    if (target === currentElement) return;
    
    if (target && (!isTooltipLocked || target === currentElement)) {
        // Remove highlight from previous element
        if (currentElement && currentElement !== target) {
            currentElement.classList.remove('qa-helper-highlight');
        }
        
        target.classList.add('qa-helper-highlight');
        
        const testCases = getTestCases(target);
        if (!testCases) return;

        showTooltip(target, testCases);
        currentElement = target;
    }
}

// Function to handle mouse out events
function handleMouseOut(e) {
    if (!isEnabled || !tooltipContainer || !tooltip || isTooltipLocked) return;

    // If we're moving to the tooltip or one of its children, don't hide
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && 
        (tooltipContainer.contains(relatedTarget) || 
         relatedTarget.closest('.qa-helper-tooltip-container'))) {
        isTooltipHovered = true;
        return;
    }

    // If we're already hovering the tooltip, don't hide
    if (isTooltipHovered) {
        const tooltipRect = tooltipContainer.getBoundingClientRect();
        if (e.clientX >= tooltipRect.left - 5 && 
            e.clientX <= tooltipRect.right + 5 &&
            e.clientY >= tooltipRect.top - 5 && 
            e.clientY <= tooltipRect.bottom + 5) {
            return;
        }
    }

    const target = e.target.closest('.qa-helper-highlight');
    if (!target) return;

    // Small delay to prevent flickering
    setTimeout(() => {
        if (!isTooltipHovered && !isTooltipLocked) {
            target.classList.remove('qa-helper-highlight');
            hideTooltip();
            currentElement = null;
            isTooltipHovered = false;
        }
    }, 50);
}

// Function to handle click events
function handleClick(e) {
    if (!isEnabled) return;
    
    if (e.target === closeButton) {
        hideTooltip();
        isTooltipLocked = false;
        if (currentElement) {
            currentElement.classList.remove('qa-helper-highlight');
            currentElement = null;
        }
        return;
    }

    // Handle copy button click
    if (e.target.closest('.qa-helper-copy-button')) {
        e.preventDefault();
        e.stopPropagation();
        if (currentElement) {
            copyTestCases(currentElement, e);
        }
        return;
    }

    const target = e.target.closest('.qa-helper-highlight');
    if (target) {
        isTooltipLocked = true;
    }
}

// Initialize event listeners
function initializeEventListeners() {
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mouseout', handleMouseOut);
    document.removeEventListener('click', handleClick);

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);
}

// Function to get all interactive elements on the page
function getAllInteractiveElements() {
    // Basic interactive elements
    const basicSelectors = [
        'button',
        'input:not([type="hidden"])',
        'select',
        'a[href]',
        'textarea',
        'form'
    ];

    // ARIA and custom interactive elements
    const ariaSelectors = [
        '[role="button"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="switch"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="combobox"]',
        '[role="searchbox"]',
        '[role="spinbutton"]',
        '[role="slider"]',
        '[role="textbox"]',
        '[role="menu"]',
        '[role="menubar"]',
        '[role="listbox"]',
        '[contenteditable="true"]'
    ];

    // Custom interactive elements (common patterns)
    const customSelectors = [
        '[onclick]',
        '[onkeydown]',
        '[onkeyup]',
        '[onkeypress]',
        '[onchange]',
        '[onfocus]',
        '[onblur]',
        '[tabindex]:not([tabindex="-1"])'
    ];

    const allSelectors = [...basicSelectors, ...ariaSelectors, ...customSelectors];
    const elements = [];

    // Get all elements matching our selectors
    allSelectors.forEach(selector => {
        const found = document.querySelectorAll(selector);
        found.forEach(el => {
            // Only add if not already in our list and is visible
            if (!elements.includes(el) && isElementVisible(el)) {
                elements.push(el);
            }
        });
    });

    return elements;
}

// Function to collect test cases for all elements
function collectAllTestCases() {
    const elements = getAllInteractiveElements();
    const elementsByType = {};

    // Group elements by their type
    elements.forEach(element => {
        let type = element.tagName.toLowerCase();
        if (element.type) {
            type = `${type}[type=${element.type}]`;
        } else if (element.getAttribute('role')) {
            type = `${type}[role=${element.getAttribute('role')}]`;
        }

        if (!elementsByType[type]) {
            elementsByType[type] = [];
        }
        elementsByType[type].push(element);
    });

    // Generate test cases for each type
    const allTestCases = [];
    for (const [type, elements] of Object.entries(elementsByType)) {
        elements.forEach(element => {
            const testCases = getTestCases(element);
            if (!testCases) return;

            allTestCases.push({
                element: `${type} ${getElementIdentifier(element)}`,
                testCases: testCases
            });
        });
    }

    // Sort by element type and identifier
    allTestCases.sort((a, b) => a.element.localeCompare(b.element));
    return allTestCases;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);

    if (request.action === 'ping') {
        sendResponse({ status: 'ok' });
        return true;
    }

    if (request.action === 'getAllTestCases') {
        const allTestCases = collectAllTestCases();
        sendResponse({ testCases: allTestCases });
        return true;
    }

    if (request.action === 'toggleExtension') {
        isEnabled = request.enabled;
        if (!isEnabled) {
            // Clean up if extension is disabled
            if (tooltipContainer) {
                tooltipContainer.remove();
                tooltipContainer = null;
                tooltip = null;
                closeButton = null;
                currentElement = null;
            }
            // Remove all event listeners
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('click', handleClick);
        } else {
            // Re-initialize if extension is enabled
            initializeExtension();
            initializeEventListeners();
        }
        sendResponse({ status: 'ok' });
        return true;
    }

    if (request.action === 'getAllTestCases') {
        const testCases = [];
        const elements = document.querySelectorAll('button, input, select, a, form, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], textarea');
        
        elements.forEach(element => {
            const cases = getTestCases(element);
            if (cases) {
                testCases.push({
                    element: getElementIdentifier(element),
                    testCases: cases
                });
            }
        });
        
        sendResponse({ testCases });
        return true;
    }
});

// Initialize when the content script loads
chrome.storage.local.get(['enabled'], function(result) {
    isEnabled = result.enabled !== false; // Default to true if not set
    if (isEnabled) {
        initializeExtension();
        initializeEventListeners();
    }
});
