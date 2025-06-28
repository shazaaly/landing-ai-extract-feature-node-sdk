#!/usr/bin/env node

/**
 * My First DocumentAI Extraction
 *
 * This is a simple example to get you started with the SDK.
 * Replace 'your-api-key-here' with your actual API key from https://app.landing.ai/
 */

const { DocumentAI } = require('./src/index');

async function quickTest() {
    const API_KEY = 'your-api-key-here'; // Replace with your key

    if (API_KEY === 'your-api-key-here') {
        console.log('❌ Set your API key first');
        return;
    }

    const docAI = new DocumentAI(API_KEY);
    const schema = { name: 'string', email: 'string' };

    try {
        // Test with any PDF file you have
        const result = await docAI.extract('./your-document.pdf', schema);
        console.log('✅ Success:', result.result.extractedData);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

quickTest();
