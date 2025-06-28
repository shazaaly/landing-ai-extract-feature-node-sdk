const { DocumentAI } = require('./src/index');

// Set your API key
const API_KEY = process.env.DOCUMENT_AI_API_KEY || 'your-api-key-here';

async function testRealAPI() {
    console.log('🚀 Testing DocumentAI SDK with Real API\n');

    // Initialize the SDK
    const docAI = new DocumentAI(API_KEY, {
        timeout: 30000,
        maxRetries: 3
    });

    // Define a simple schema for invoice extraction
    const invoiceSchema = {
        invoice_number: 'string',
        invoice_date: 'string',
        total_amount: 'string',
        vendor_name: 'string',
        customer_name: 'string'
    };

    try {
        // Test connection first
        console.log('🔗 Testing API connection...');
        const connectionTest = await docAI.testConnection();
        console.log('Connection test:', connectionTest.success ? '✅ Success' : '❌ Failed');

        if (!connectionTest.success) {
            console.log('❌ Connection failed. Please check:');
            console.log('  1. Your API key is correct');
            console.log('  2. You have internet connection');
            console.log('  3. The API service is available');
            return;
        }

        // Check if test file exists
        const fs = require('fs');
        if (!fs.existsSync('./test-invoice.pdf')) {
            console.log('📄 Creating test PDF file...');
            require('./create-test-file.js');
        }

        // Extract data from the test PDF file
        console.log('\n📄 Extracting data from test PDF...');
        const result = await docAI.extract('./test-invoice.pdf', invoiceSchema);

        console.log('✅ Extraction completed!');
        console.log('Document ID:', result.documentId);
        console.log('Success:', result.success);
        console.log('Extracted data:', JSON.stringify(result.result.extractedData, null, 2));
        console.log('Confidence:', result.result.confidence);
        console.log('Processing time:', result.result.processingTime, 'ms');
        console.log('Status:', result.result.status);

        // Show detailed report
        console.log('\n📊 Detailed Report:');
        const detailedReport = result.result.getDetailedReport();
        console.log('Summary:', detailedReport.summary);
        console.log('Fields:', Object.keys(detailedReport.fields));

    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.message.includes('API key')) {
            console.log('\n💡 To fix this:');
            console.log('  1. Get your API key from https://app.landing.ai/');
            console.log('  2. Set it as environment variable:');
            console.log('     export DOCUMENT_AI_API_KEY=your-actual-api-key');
            console.log('  3. Or pass it directly in the code');
        }

        if (error.message.includes('File not found')) {
            console.log('\n💡 To fix this:');
            console.log('  1. Run: node create-test-file.js');
            console.log('  2. Or use an existing PDF file');
        }
    }
}

// Run the test
testRealAPI().catch(console.error);