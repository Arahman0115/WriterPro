// TextEditorFunctions.js

// Function to apply bold formatting
export const applyBold = (text) => {
    return `<strong>${text}</strong>`;
};

// Function to apply italic formatting
export const applyItalic = (text) => {
    return `<em>${text}</em>`;
};

// Function to apply underline formatting
export const applyUnderline = (text) => {
    return `<u>${text}</u>`;
};

// Function to apply strikethrough formatting
export const applyStrikethrough = (text) => {
    return `<del>${text}</del>`;
};

// Function to insert a link
export const insertLink = (text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

// Add more functions as needed
