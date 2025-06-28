const { DocumentAI } = require('../src/index');

// Set your API key
const API_KEY = process.env.DOCUMENT_AI_API_KEY || 'your-api-key-here';

async function simpleUsage() {
    console.log('🚀 DocumentAI Simple Usage Example\n');

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
            console.log('Please check your API key and try again.');
            return;
        }

        // Extract data from a local PDF file
        console.log('\n📄 Extracting data from local PDF...');
        const result = await docAI.extract('./example-invoice.pdf', invoiceSchema);

        console.log('✅ Extraction completed!');
        console.log('Document ID:', result.documentId);
        console.log('Extracted data:', result.result.extractedData);
        console.log('Confidence:', result.result.confidence);
        console.log('Processing time:', result.result.processingTime, 'ms');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the example
simpleUsage().catch(console.error);