// Global variables for tooltip state and elements
let tooltipContainer = null;
let tooltip = null;
let closeButton = null;
let copyButton = null;
let lockButton = null;
let isTooltipLocked = false;
let isTooltipHovered = false;
let currentElement = null;

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

        // Create copy button
        copyButton = document.createElement('button');
        copyButton.className = 'qa-helper-copy-button';
        copyButton.innerHTML = 'Copy Test Cases';
        copyButton.setAttribute('data-testid', 'qa-helper-copy-button');
        copyButton.setAttribute('aria-label', 'Copy test cases to clipboard');
        copyButton.title = 'Copy test cases to clipboard';
        tooltip.appendChild(copyButton);

        // Create lock button
        lockButton = document.createElement('button');
        lockButton.className = 'qa-helper-lock-button';
        lockButton.innerHTML = '🔒'; // Lock emoji
        lockButton.setAttribute('data-testid', 'qa-helper-lock-button');
        lockButton.setAttribute('aria-label', 'Lock test case tooltip');
        lockButton.title = 'Lock test case tooltip';
        tooltip.appendChild(lockButton);

        // Add event listeners
        closeButton.addEventListener('click', () => {
            isTooltipLocked = false;
            lockButton.classList.remove('locked');
            lockButton.innerHTML = '🔓'; // Unlocked emoji
            hideTooltip();
        });

        function showCopiedMessage(x, y) {
            const successMessage = document.createElement('div');
            successMessage.className = 'copy-success-message';
            successMessage.textContent = 'Test cases copied!';
            successMessage.style.position = 'fixed';
            successMessage.style.left = `${x}px`;
            successMessage.style.top = `${y}px`;
            successMessage.style.backgroundColor = '#4CAF50';
            successMessage.style.color = 'white';
            successMessage.style.padding = '5px 10px';
            successMessage.style.borderRadius = '3px';
            successMessage.style.zIndex = '10000';
            document.body.appendChild(successMessage);

            setTimeout(() => {
                successMessage.style.opacity = '0';
                successMessage.style.transition = 'opacity 0.5s';
                setTimeout(() => successMessage.remove(), 500);
            }, 1000);
        }

        function copyTestCases(element, event) {
            const testCasesText = formatTestCasesForCopy(element);
            if (!testCasesText) return;

            navigator.clipboard.writeText(testCasesText).then(() => {
                // Show success message near the click position
                const x = event ? event.clientX + 10 : element.getBoundingClientRect().right + 10;
                const y = event ? event.clientY - 20 : element.getBoundingClientRect().top - 10;
                showCopiedMessage(x, y);

                // Update button text temporarily
                if (copyButton) {
                    copyButton.innerHTML = 'Copied!';
                    setTimeout(() => {
                        copyButton.innerHTML = 'Copy Test Cases';
                    }, 2000);
                }
            });
        }

        copyButton.addEventListener('click', (e) => {
            if (currentElement) {
                copyTestCases(currentElement, e);
            }
        });

        lockButton.addEventListener('click', () => {
            isTooltipLocked = !isTooltipLocked;
            lockButton.classList.toggle('locked');
            lockButton.innerHTML = isTooltipLocked ? '🔒' : '🔓'; // Lock/unlock emoji
        });

        return true;
    } catch (error) {
        console.error('Error initializing extension:', error);
        return false;
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request); // Debug log

    if (request.action === 'ping') {
        const isInitialized = initializeExtension();
        sendResponse({ status: isInitialized ? 'ok' : 'error' });
    } else if (request.action === 'getAllTestCases') {
        try {
            const testCases = getAllTestCasesFromPage();
            console.log('Generated test cases:', testCases); // Debug log
            sendResponse({ testCases: testCases });
        } catch (error) {
            console.error('Error generating test cases:', error);
            sendResponse({ error: error.message });
        }
    }
    return true; // Keep the message channel open for async response
});

// Initialize extension when the script loads
initializeExtension();

// Function to collect all test cases from interactive elements on the page
function getAllTestCasesFromPage() {
    const interactiveElements = document.querySelectorAll('button, input, select, a, form, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], textarea');
    const allTestCases = [];
    const processedElements = new Set(); // To avoid duplicate elements

    interactiveElements.forEach(element => {
        // Create a unique identifier for the element to avoid duplicates
        const elementKey = getElementUniqueKey(element);
        if (processedElements.has(elementKey)) {
            return;
        }
        processedElements.add(elementKey);

        // Get element information
        const elementType = element.tagName.toLowerCase();
        const elementRole = element.getAttribute('role');
        const elementIdentifier = getElementIdentifier(element);

        // Determine which test cases to use based on element type and role
        let elementTestCases = [];
        if (elementRole && testCaseSuggestions[elementRole]) {
            elementTestCases = testCaseSuggestions[elementRole];
        } else if (testCaseSuggestions[elementType]) {
            elementTestCases = testCaseSuggestions[elementType];
        } else {
            elementTestCases = testCaseSuggestions.default || [];
        }

        elementTestCases.forEach(testCase => {
            // Create a unique test case by combining element info with the test case
            const formattedTestCase = formatTestCase(testCase, elementType, elementIdentifier);
            if (!allTestCases.some(tc => tc === formattedTestCase)) {
                allTestCases.push(formattedTestCase);
            }
        });
    });

    return allTestCases;
}

// Function to generate a unique key for an element
function getElementUniqueKey(element) {
    const id = element.id;
    const classes = Array.from(element.classList).join(' ');
    const text = element.textContent?.trim();
    const type = element.type;
    const name = element.name;
    const role = element.getAttribute('role');
    
    return `${id}-${classes}-${text}-${type}-${name}-${role}`;
}

// Function to get a human-readable identifier for an element
function getElementIdentifier(element) {
    if (!element) return '';

    // Array of possible identifiers in order of preference
    const identifiers = [];

    // Get data-testid attribute
    const testId = element.getAttribute('data-testid');
    if (testId) identifiers.push(`[data-testid="${testId}"]`);

    // Get aria-label attribute
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) identifiers.push(`[aria-label="${ariaLabel}"]`);

    // Get title attribute
    const title = element.getAttribute('title');
    if (title) identifiers.push(`[title="${title}"]`);

    // Get element's id
    const id = element.id;
    if (id) identifiers.push(`#${id}`);

    // Get element's name attribute
    const name = element.getAttribute('name');
    if (name) identifiers.push(`[name="${name}"]`);

    // Get element's text content
    const text = element.textContent?.trim();
    if (text && text.length < 50 && !/^[\u2000-\u3300\ud83c\ud000-\ud83d\udfff\ud83e\ud000-\ud83e\udfff]+$/.test(text)) {
        identifiers.push(`"${text}"`);
    }

    // Get element's value
    const value = element.value;
    if (value && value.length < 50) identifiers.push(`[value="${value}"]`);

    // Get element's placeholder
    const placeholder = element.placeholder;
    if (placeholder) identifiers.push(`[placeholder="${placeholder}"]`);

    // Get element's type
    const type = element.getAttribute('type');
    if (type) identifiers.push(`[type="${type}"]`);

    // Get element's role
    const role = element.getAttribute('role');
    if (role) identifiers.push(`[role="${role}"]`);

    // Return the most meaningful identifier or combination of identifiers
    if (identifiers.length > 0) {
        // If we have multiple identifiers, combine the most meaningful ones
        if (identifiers.length > 1) {
            return `${identifiers[0]} ${identifiers[1]}`;
        }
        return identifiers[0];
    }

    // If no identifiers found, return element tag name
    return `<${element.tagName.toLowerCase()}>`;
}

// Function to format a test case with element information
function formatTestCase(testCase, elementType, elementIdentifier) {
    const formattedSteps = testCase.steps.map(step => `   ${step}`).join('\n');
    return `Test Case: ${testCase.title}\nElement: ${elementType} ${elementIdentifier}\nSteps to Reproduce:\n${formattedSteps}\n`;
}

// Test case suggestions for different element types
const testCaseSuggestions = {
    // Default test cases for any interactive element
    default: [
        {
            title: "Basic interaction",
            steps: [
                "1. Locate the element on the page",
                "2. Verify element is visible and accessible",
                "3. Interact with the element (click, input, etc.)",
                "4. Verify expected behavior occurs"
            ]
        },
        {
            title: "Keyboard accessibility",
            steps: [
                "1. Tab to the element using keyboard",
                "2. Verify focus indicator is visible",
                "3. Interact using keyboard (Enter/Space)",
                "4. Verify same behavior as mouse interaction"
            ]
        }
    ],

    // Role-specific test cases
    "checkbox": [
        {
            title: "Checkbox state toggle",
            steps: [
                "1. Locate the checkbox",
                "2. Verify initial state (checked/unchecked)",
                "3. Click the checkbox",
                "4. Verify state changes correctly",
                "5. Click again",
                "6. Verify returns to initial state"
            ]
        }
    ],

    "radio": [
        {
            title: "Radio button selection",
            steps: [
                "1. Locate the radio button group",
                "2. Note the currently selected option",
                "3. Click a different radio button",
                "4. Verify only one option is selected",
                "5. Verify previous selection is deselected"
            ]
        }
    ],

    "tab": [
        {
            title: "Tab panel switching",
            steps: [
                "1. Locate the tab element",
                "2. Click the tab",
                "3. Verify correct panel is displayed",
                "4. Verify other panels are hidden",
                "5. Verify tab is marked as active"
            ]
        }
    ],

    "menuitem": [
        {
            title: "Menu item selection",
            steps: [
                "1. Open the parent menu",
                "2. Locate the menu item",
                "3. Click the menu item",
                "4. Verify expected action occurs",
                "5. Verify menu closes after selection"
            ]
        }
    ],

    textarea: [
        {
            title: "Text area input handling",
            steps: [
                "1. Click the text area",
                "2. Type a long text with multiple lines",
                "3. Verify text wrapping works correctly",
                "4. Verify scrolling works if content overflows",
                "5. Test copy/paste functionality"
            ]
        },
        {
            title: "Text area validation",
            steps: [
                "1. Check for character limit if specified",
                "2. Test with maximum allowed length",
                "3. Try exceeding the limit",
                "4. Verify appropriate error message",
                "5. Check if newlines are properly handled"
            ]
        }
    ],


    button: [
        {
            title: "Click functionality",
            steps: [
                "1. Find the button on the page",
                "2. Click on the button",
                "3. Verify the expected action occurs",
                "4. Verify any state changes or updates on the page"
            ]
        },
        {
            title: "Disabled state handling",
            steps: [
                "1. Check if button can be disabled",
                "2. If applicable, trigger conditions to disable the button",
                "3. Verify button is visually shown as disabled",
                "4. Attempt to click the disabled button",
                "5. Verify no action occurs when clicked"
            ]
        },
        {
            title: "Visual feedback on hover/click",
            steps: [
                "1. Hover over the button",
                "2. Verify hover state visual changes",
                "3. Click and hold the button",
                "4. Verify active state visual changes",
                "5. Release the button",
                "6. Verify return to default state"
            ]
        }
    ],
    input: [
        {
            title: "Valid input acceptance",
            steps: [
                "1. Locate the input field",
                "2. Enter valid data according to field requirements",
                "3. Verify input is accepted",
                "4. Verify no error messages appear"
            ]
        },
        {
            title: "Invalid input handling",
            steps: [
                "1. Locate the input field",
                "2. Enter invalid data",
                "3. Verify error message appears",
                "4. Verify input is marked as invalid",
                "5. Verify form cannot be submitted with invalid input"
            ]
        },
        {
            title: "Required field validation",
            steps: [
                "1. Leave the required field empty",
                "2. Try to submit the form",
                "3. Verify error message appears",
                "4. Verify form cannot be submitted"
            ]
        }
    ],
    form: [
        {
            title: "Form submission",
            steps: [
                "1. Fill all required fields with valid data",
                "2. Submit the form",
                "3. Verify submission is successful",
                "4. Verify appropriate success message or redirect"
            ]
        },
        {
            title: "Form validation",
            steps: [
                "1. Leave some required fields empty",
                "2. Fill some fields with invalid data",
                "3. Submit the form",
                "4. Verify all validation errors are shown",
                "5. Verify form is not submitted"
            ]
        }
    ],
    link: [
        {
            title: "Correct destination",
            steps: [
                "1. Click the link",
                "2. Verify correct page/resource is loaded",
                "3. Verify URL matches expected destination",
                "4. Test browser back navigation"
            ]
        },
        {
            title: "External link behavior",
            steps: [
                "1. Identify if link is external",
                "2. Click the link",
                "3. Verify link opens in new tab/window if external",
                "4. Verify security warnings if applicable"
            ]
        }
    ],
    select: [
        {
            title: "All options selectable",
            steps: [
                "1. Click the dropdown to open it",
                "2. Verify all options are visible",
                "3. Click each option one by one",
                "4. Verify each option can be selected",
                "5. Verify selected option is displayed correctly"
            ]
        },
        {
            title: "Default option set",
            steps: [
                "1. Load the page",
                "2. Locate the select element",
                "3. Verify correct default option is selected",
                "4. Verify default value is appropriate for the context"
            ]
        }
    ]
};



// Function to show tooltip
function showTooltip(element, testCases) {
    if (isTooltipLocked && element !== currentElement) {
        return; // Don't show tooltip for other elements when locked
    }

    currentElement = element;
    const elementRect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // First display the tooltip to calculate its size
    tooltipContainer.style.display = 'block';
    tooltipContainer.style.visibility = 'hidden'; // Hide it temporarily

    // Clear previous content
    const existingContent = tooltip.querySelector('.tooltip-content');
    if (existingContent) {
        existingContent.remove();
    }

    // Create and append new content
    const content = document.createElement('div');
    content.className = 'tooltip-content';
    content.innerHTML = testCases;
    tooltip.appendChild(content);

    // Calculate available space
    const tooltipRect = tooltipContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - elementRect.bottom;
    const spaceAbove = elementRect.top;

    // Position the tooltip
    let top;
    if (spaceBelow < tooltipRect.height && spaceAbove > tooltipRect.height) {
        // If not enough space below but enough space above, show above the element
        top = elementRect.top + scrollY - tooltipRect.height;
        tooltipContainer.classList.add('tooltip-above');
    } else {
        // Show below the element
        top = elementRect.bottom + scrollY;
        tooltipContainer.classList.remove('tooltip-above');
    }

    // Calculate horizontal position to keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    let left = elementRect.left + scrollX;
    if (left + tooltipRect.width > viewportWidth) {
        left = viewportWidth - tooltipRect.width - 10; // 10px padding from viewport edge
    }
    if (left < 0) left = 10; // 10px padding from viewport edge

    // Apply final position
    tooltipContainer.style.left = left + 'px';
    tooltipContainer.style.top = top + 'px';
    tooltipContainer.style.visibility = 'visible'; // Make it visible again
}

// Function to hide tooltip
function hideTooltip() {
    if (isTooltipLocked) return;
    
    tooltipContainer.style.display = 'none';
    if (currentElement) {
        currentElement.classList.remove('qa-helper-highlight');
    }
    currentElement = null;
}

// Function to get element type and generate test cases
function getTestCases(element) {
    // Ignore elements inside our tooltip
    if (!element || tooltipContainer.contains(element)) return null;

    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label') || '';
    const placeholder = element.getAttribute('placeholder') || '';
    const elementText = element.textContent?.trim() || '';

    // Determine element's purpose from its attributes
    const purpose = ariaLabel || placeholder || elementText || type || role || tagName;

    if (element.matches('button, input[type="button"], input[type="submit"]')) {
        return [{
            title: "Button Functionality",
            steps: [
                `1. Verify button "${purpose}" is visible and enabled`,
                `2. Check button text/icon is correctly displayed`,
                `3. Click the button and verify expected action occurs`,
                `4. Verify button state changes appropriately (if applicable)`,
                `5. Test keyboard accessibility (Tab focus and Enter key)`
            ]
        }];
    } else if (element.matches('input[type="text"], input:not([type])')) {
        return [{
            title: "Text Input Validation",
            steps: [
                `1. Verify input field "${purpose}" is visible and enabled`,
                `2. Check placeholder text is displayed correctly (if applicable)`,
                `3. Enter valid text and verify it's accepted`,
                `4. Test field restrictions (max length, allowed characters)`,
                `5. Verify input field handles special characters correctly`
            ]
        }];
    } else if (element.matches('input[type="search"]')) {
        return [{
            title: "Search Input Testing",
            steps: [
                `1. Verify search input "${purpose}" is visible and accessible`,
                `2. Enter search term and verify search triggers correctly`,
                `3. Test search with different types of queries`,
                `4. Verify search results are displayed appropriately`,
                `5. Check search input clears correctly`
            ]
        }];
    } else if (element.matches('form')) {
        return [{
            title: "Form Validation",
            steps: [
                `1. Verify all form fields are visible and properly labeled`,
                `2. Test form submission with valid data`,
                `3. Verify form validation for required fields`,
                `4. Test form submission with invalid data`,
                `5. Check form reset functionality`
            ]
        }];
    } else if (element.matches('a')) {
        return [{
            title: "Link Functionality",
            steps: [
                `1. Verify link "${purpose}" is visible and properly styled`,
                `2. Check link href points to correct destination`,
                `3. Test link click navigates to expected page`,
                `4. Verify link state changes on hover/visited`,
                `5. Test keyboard accessibility (Tab focus and Enter key)`
            ]
        }];
    } else if (element.matches('select')) {
        return [{
            title: "Dropdown Functionality",
            steps: [
                `1. Verify dropdown "${purpose}" is visible and enabled`,
                `2. Check all options are displayed correctly`,
                `3. Test selection of different options`,
                `4. Verify selected option is properly displayed`,
                `5. Test keyboard navigation through options`
            ]
        }];
    }

    // Default test cases for any interactive element
    return [{
        title: `UI Element Testing`,
        steps: [
            `1. Verify "${purpose}" element is visible and accessible`,
            `2. Check element's visual appearance matches design`,
            `3. Test element's primary interaction method`,
            `4. Verify element responds correctly to user input`,
            `5. Test keyboard accessibility if applicable`
        ]
    }];
}

// Function to format test cases for copying
function formatTestCasesForCopy(element) {
    const testCases = getTestCases(element);
    if (!testCases) return '';

    const elementIdentifier = getElementIdentifier(element);
    let formattedText = `Element: ${element.tagName.toLowerCase()} ${elementIdentifier}\n\n`;

    testCases.forEach(tc => {
        formattedText += `• ${tc.title}\n`;
        tc.steps.forEach(step => {
            formattedText += `  - ${step}\n`;
        });
        formattedText += '\n';
    });

    return formattedText;
}

// Function to copy test cases and show success message
function copyTestCases(element, event) {
    const testCasesText = formatTestCasesForCopy(element);
    if (!testCasesText) return;

    navigator.clipboard.writeText(testCasesText).then(() => {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'copy-success-message';
        successMessage.textContent = 'Test cases copied!';
        successMessage.style.position = 'fixed';
        successMessage.style.left = `${event.clientX + 10}px`;
        successMessage.style.top = `${event.clientY - 20}px`;
        successMessage.style.backgroundColor = '#4CAF50';
        successMessage.style.color = 'white';
        successMessage.style.padding = '5px 10px';
        successMessage.style.borderRadius = '3px';
        successMessage.style.zIndex = '10000';
        document.body.appendChild(successMessage);

        // Remove message after animation
        setTimeout(() => {
            successMessage.style.opacity = '0';
            successMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => successMessage.remove(), 500);
        }, 1000);
    });
}

// Add hover and click listeners to interactive elements
document.addEventListener('mouseover', (e) => {
    if (!tooltipContainer || !tooltip) return;

    // Ignore elements inside our tooltip
    if (tooltipContainer.contains(e.target)) return;

    const interactiveElements = 'button, input, select, a, form, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], textarea';
    const target = e.target.closest(interactiveElements);
    
    if (target && (!isTooltipLocked || target === currentElement)) {
        target.classList.add('qa-helper-highlight');
        
        const testCases = getTestCases(target);
        if (!testCases) return;

        const elementIdentifier = getElementIdentifier(target);
        
        const testCasesHtml = testCases.map(tc => `
            <div class="test-case">
                <strong>• ${tc.title}</strong>
                <div class="steps">
                    ${tc.steps.map(step => `<div class="step">${step}</div>`).join('')}
                </div>
            </div>
        `).join('');
        
        const formattedTestCases = `
            <div class="tooltip-content">
                <strong>Element: ${target.tagName.toLowerCase()} ${elementIdentifier}</strong>
                <div class="test-cases">
                    ${testCasesHtml}
                </div>
                <div class="tooltip-hint">(Click highlighted element to copy test cases)</div>
            </div>
        `;
        
        showTooltip(target, formattedTestCases);
    }
});

// Add click handler to copy test cases
document.addEventListener('click', (e) => {
    const copyButton = e.target.closest('.qa-helper-copy-button');
    if (copyButton) {
        // If clicking the copy button, copy test cases for the current element
        if (currentElement) {
            copyTestCases(currentElement, e);
        }
        return;
    }
    
    // For other elements, copy on click if they're highlighted
    const target = e.target.closest('.qa-helper-highlight');
    if (!target) return;

    copyTestCases(target, e);
});

// Handle mouse events for interactive elements
document.addEventListener('mouseover', (e) => {
    if (!tooltipContainer || !tooltip || isTooltipLocked) return;

    const interactiveElements = 'button, input, select, a, form, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], textarea';
    const target = e.target.closest(interactiveElements);
    
    if (target === currentElement) {
        tooltipContainer.style.display = 'block';
    } else if (!isTooltipHovered && target !== currentElement) {
        hideTooltip();
    }
});

document.addEventListener('mouseout', (e) => {
    if (!tooltipContainer || !tooltip || isTooltipLocked || isTooltipHovered) return;

    const target = e.target.closest('.qa-helper-highlight');
    if (target === currentElement && !tooltipContainer.contains(e.relatedTarget)) {
        hideTooltip();
    }
});
