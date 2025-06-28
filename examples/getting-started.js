#!/usr/bin/env node

/**
 * DocumentAI SDK - Getting Started Example
 *
 * This example shows the most basic usage of the SDK.
 * Run with: node examples/getting-started.js
 */

const { DocumentAI } = require('../src/index');

async function main() {
    console.log('🚀 DocumentAI SDK - Getting Started\n');

    // Check if API key is set
    if (!process.env.DOCUMENT_AI_API_KEY) {
        console.log('❌ Please set your API key:');
        console.log('   export DOCUMENT_AI_API_KEY=your-api-key-here\n');
        console.log('   Get your API key from: https://app.landing.ai/\n');
        return;
    }

    try {
        // Initialize SDK
        console.log('📋 Initializing DocumentAI SDK...');
        const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);

        // Test connection
        console.log('🔗 Testing API connection...');
        const connectionTest = await docAI.testConnection();

        if (!connectionTest.success) {
            console.log('❌ Connection failed:', connectionTest.message);
            console.log('   Please check your API key and internet connection.\n');
            return;
        }

        console.log('✅ Connection successful!\n');

        // Define a simple schema
        console.log('📄 Defining extraction schema...');
        const schema = {
            name: 'string',
            email: 'string',
            phone: 'string',
            address: 'string'
        };

        console.log('Schema:', JSON.stringify(schema, null, 2), '\n');

        // Check if test file exists
        const fs = require('fs');
        const testFile = './test-document.pdf';

        if (!fs.existsSync(testFile)) {
            console.log('📝 Creating test PDF file...');

            // Create a simple test PDF
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument();
            const writeStream = fs.createWriteStream(testFile);

            doc.pipe(writeStream);
            doc.fontSize(16).text('Sample Document', 100, 100);
            doc.fontSize(12).text('Name: John Doe', 100, 150);
            doc.fontSize(12).text('Email: john.doe@example.com', 100, 180);
            doc.fontSize(12).text('Phone: (555) 123-4567', 100, 210);
            doc.fontSize(12).text('Address: 123 Main St, City, State 12345', 100, 240);
            doc.end();

            writeStream.on('finish', () => {
                console.log('✅ Test PDF created:', testFile, '\n');
            });

            // Wait a moment for file to be written
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Extract data
        console.log('🔍 Extracting data from document...');
        const result = await docAI.extract(testFile, schema);

        if (result.success) {
            console.log('✅ Extraction successful!\n');

            const extraction = result.result;
            console.log('📊 Results:');
            console.log('   Document ID:', result.documentId);
            console.log('   Confidence:', (extraction.confidence * 100).toFixed(1) + '%');
            console.log('   Processing Time:', extraction.processingTime + 'ms');
            console.log('   Completion:', extraction.getCompletionPercentage() + '%\n');

            console.log('📋 Extracted Data:');
            console.log(JSON.stringify(extraction.extractedData, null, 2), '\n');

            // Show field details
            console.log('🔍 Field Details:');
            Object.keys(schema).forEach(fieldName => {
                const fieldInfo = extraction.getField(fieldName);
                console.log(`   ${fieldName}: "${fieldInfo.value}" (confidence: ${(fieldInfo.confidence * 100).toFixed(1)}%)`);
            });

        } else {
            console.log('❌ Extraction failed:', result.error);
        }

    } catch (error) {
        console.log('❌ Error:', error.message);

        if (error.message.includes('API key')) {
            console.log('\n💡 Make sure your API key is correct and properly set.');
        } else if (error.message.includes('File not found')) {
            console.log('\n💡 Make sure the test file exists and is accessible.');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 The request timed out. Try again or check your internet connection.');
        }
    }
}

// Run the example
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };