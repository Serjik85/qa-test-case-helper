// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAllTestCases") {
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

// Function to collect all test cases from interactive elements on the page
function getAllTestCasesFromPage() {
    const interactiveElements = document.querySelectorAll('button, input, select, a, form, [role="button"]');
    const allTestCases = [];

    interactiveElements.forEach(element => {
        const elementTestCases = getTestCases(element);
        const elementType = element.tagName.toLowerCase();
        const elementIdentifier = getElementIdentifier(element);

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

// Function to get a human-readable identifier for an element
function getElementIdentifier(element) {
    const id = element.id ? `#${element.id}` : '';
    const text = element.textContent?.trim();
    const value = element.value;
    const type = element.type;
    const placeholder = element.placeholder;

    if (id) return id;
    if (text && text.length < 50) return `"${text}"`;
    if (placeholder) return `[placeholder="${placeholder}"]`;
    if (value) return `[value="${value}"]`;
    if (type) return `[type="${type}"]`;
    
    return element.tagName.toLowerCase();
}

// Function to format a test case with element information
function formatTestCase(testCase, elementType, elementIdentifier) {
    const formattedSteps = testCase.steps.map(step => `   ${step}`).join('\n');
    return `Test Case: ${testCase.title}\nElement: ${elementType} ${elementIdentifier}\nSteps to Reproduce:\n${formattedSteps}\n`;
}

// Test case suggestions for different element types
const testCaseSuggestions = {
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

// Create tooltip element
const tooltip = document.createElement('div');
tooltip.className = 'qa-helper-tooltip';
document.body.appendChild(tooltip);

// Function to get element type and generate test cases
function getTestCases(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    const role = element.getAttribute('role');

    if (element.matches('button, input[type="button"], input[type="submit"]')) {
        return testCaseSuggestions.button;
    } else if (element.matches('input')) {
        return testCaseSuggestions.input;
    } else if (element.matches('form')) {
        return testCaseSuggestions.form;
    } else if (element.matches('a')) {
        return testCaseSuggestions.link;
    } else if (element.matches('select')) {
        return testCaseSuggestions.select;
    }

    return ["Check functionality", "Verify display", "Test interaction"];
}

// Add hover listeners to interactive elements
document.addEventListener('mouseover', (e) => {
    const interactiveElements = 'button, input, select, a, form, [role="button"]';
    const target = e.target.closest(interactiveElements);
    
    if (target) {
        target.classList.add('qa-helper-highlight');
        
        const testCases = getTestCases(target);
        const elementIdentifier = getElementIdentifier(target);
        
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
                <strong>Element: ${target.tagName.toLowerCase()} ${elementIdentifier}</strong>
                <div class="test-cases">
                    ${testCasesHtml}
                </div>
            </div>
        `;
        
        const rect = target.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.display = 'block';
    }
});

document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('button, input, select, a, form, [role="button"]');
    if (target) {
        target.classList.remove('qa-helper-highlight');
        tooltip.style.display = 'none';
    }
});
