// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAllTestCases") {
        const testCases = getAllTestCasesFromPage();
        sendResponse({ testCases });
    }
    return true;
});

// Function to collect all test cases from interactive elements on the page
function getAllTestCasesFromPage() {
    const interactiveElements = document.querySelectorAll('button, input, select, a, form, [role="button"]');
    const allTestCases = new Set();

    interactiveElements.forEach(element => {
        const testCases = getTestCases(element);
        testCases.forEach(testCase => allTestCases.add(testCase));
    });

    return Array.from(allTestCases);
}

// Test case suggestions for different element types
const testCaseSuggestions = {
    button: [
        "Click functionality",
        "Disabled state handling",
        "Visual feedback on hover/click",
        "Proper label/text display"
    ],
    input: [
        "Valid input acceptance",
        "Invalid input handling",
        "Required field validation",
        "Max length constraints",
        "Special characters handling"
    ],
    form: [
        "Form submission",
        "Form validation",
        "Error message display",
        "Success message display",
        "Required fields handling"
    ],
    link: [
        "Correct destination",
        "External link behavior",
        "Dead link check",
        "Link text relevance"
    ],
    select: [
        "All options selectable",
        "Default option set",
        "Multiple selection (if applicable)",
        "Option group handling"
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
        const testCasesList = testCases.map(tc => `• ${tc}`).join('\n');
        
        tooltip.innerHTML = `
            <strong>Element: ${target.tagName.toLowerCase()}</strong>
            <br>Test Cases to Consider:<br>
            ${testCasesList}
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
