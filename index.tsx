/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// --- DOM Element Selection ---
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fileLabel = document.querySelector('.file-label') as HTMLLabelElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
const convertButton = document.getElementById('convert-button') as HTMLButtonElement;
const resultContainer = document.getElementById('result-container') as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;

let imageBase64: string | null = null;

// --- API Initialization ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// --- Utility Functions ---

/**
 * Converts a file to a base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 string.
 */
function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

/**
 * Sets the loading state of the UI.
 * @param isLoading Whether the app is in a loading state.
 */
function setLoading(isLoading: boolean) {
    loader.classList.toggle('hidden', !isLoading);
    convertButton.disabled = isLoading;
    if (isLoading) {
        convertButton.textContent = 'Processing...';
    } else {
        convertButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 0h-2v7h2v-7zm-4.5 0h-2v7h2v-7zM20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/></svg>
            Convert to Vietnamese
        `;
    }
}

/**
 * Displays an error message in the result container.
 * @param message The error message to display.
 */
function displayError(message: string) {
    resultContainer.innerHTML = `<div class="error">${message}</div>`;
}

// --- Event Handlers ---

/**
 * Handles the file input change event.
 */
async function handleFileChange() {
    const file = fileInput.files?.[0];
    if (file) {
        try {
            const part = await fileToGenerativePart(file);
            imageBase64 = part.inlineData.data; // Store base64 data

            imagePreview.src = `data:${file.type};base64,${imageBase64}`;
            imagePreviewContainer.classList.remove('hidden');
            convertButton.disabled = false;
            fileLabel.classList.add('hidden'); // Hide upload button after selection
            resultContainer.innerHTML = ''; // Clear previous results
        } catch (error) {
            console.error('Error reading file:', error);
            displayError('Could not read the selected image. Please try another one.');
            resetUI();
        }
    }
}


/**
 * Handles the convert button click event.
 */
async function handleConvert() {
    if (!imageBase64) {
        displayError('Please select an image first.');
        return;
    }

    setLoading(true);
    resultContainer.innerHTML = '';

    const imagePart = {
      inlineData: {
        mimeType: 'image/png', // Assuming png, can be dynamic from file type
        data: imageBase64,
      },
    };

    const textPart = {
      text: "Extract the text from this image and provide it in standard Vietnamese."
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        const text = response.text.trim();
        resultContainer.innerHTML = `<pre>${text}</pre>`;

    } catch (error) {
        console.error('API Error:', error);
        displayError('An error occurred while communicating with the API. Please try again.');
    } finally {
        setLoading(false);
    }
}

/**
 * Resets the UI to its initial state.
 */
function resetUI() {
    fileInput.value = '';
    imageBase64 = null;
    imagePreviewContainer.classList.add('hidden');
    convertButton.disabled = true;
    resultContainer.innerHTML = '';
    fileLabel.classList.remove('hidden');
}


// --- Event Listeners ---
fileInput.addEventListener('change', handleFileChange);
convertButton.addEventListener('click', handleConvert);

// Initial state
resetUI();
