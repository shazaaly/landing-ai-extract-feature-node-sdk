const { DocumentAI } = require('./src/index');
const fs = require('fs');

// Set your API key
const API_KEY = process.env.DOCUMENT_AI_API_KEY || 'your-api-key-here';

async function testExtraction() {
    console.log('🚀 Testing DocumentAI Extraction Functionality\n');

    // Initialize the SDK
    const docAI = new DocumentAI(API_KEY, {
        timeout: 60000, // 60 seconds for extraction
        maxRetries: 3
    });

    // Define a comprehensive schema for testing
    const testSchema = {
        fields: {
            document_type: {
                type: 'string',
                validation: {
                    enum: ['invoice', 'receipt', 'contract', 'form', 'other']
                }
            },
            invoice_number: {
                type: 'string',
                validation: {
                    minLength: 1,
                    maxLength: 50
                }
            },
            invoice_date: {
                type: 'string'
            },
            total_amount: {
                type: 'string'
            },
            vendor_name: {
                type: 'string',
                validation: {
                    minLength: 1,
                    maxLength: 100
                }
            },
            customer_name: {
                type: 'string',
                validation: {
                    minLength: 1,
                    maxLength: 100
                }
            },
            line_items: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        description: { type: 'string' },
                        quantity: { type: 'string' },
                        unit_price: { type: 'string' },
                        total: { type: 'string' }
                    }
                },
                validation: {
                    minItems: 0,
                    maxItems: 50
                }
            }
        },
        required: ['document_type'],
        additionalProperties: false,
        version: '1.0.0'
    };

    try {
        // Test connection first
        console.log('🔗 Testing API connection...');
        const connectionTest = await docAI.testConnection();
        console.log('Connection test:', connectionTest.success ? '✅ Success' : '❌ Failed');
        console.log('Message:', connectionTest.message);
        console.log('Status:', connectionTest.status);

        if (!connectionTest.success) {
            console.log('\n❌ Connection failed. Please check:');
            console.log('  1. Your API key is correct');
            console.log('  2. You have internet connection');
            console.log('  3. The API service is available');
            return;
        }

        // Check if test file exists, create if not
        if (!fs.existsSync('./test-invoice.pdf')) {
            console.log('📄 Creating test PDF file...');
            require('./create-test-file.js');
        }

        // Validate schema before extraction
        console.log('\n📋 Validating schema...');
        const schemaValidation = docAI.validateSchema(testSchema);
        console.log('Schema validation:', schemaValidation.isValid ? '✅ Valid' : '❌ Invalid');
        if (schemaValidation.isValid) {
            console.log('Schema summary:', schemaValidation.summary);
        }

        // Extract data from the test PDF file
        console.log('\n📄 Starting extraction...');
        console.log('File:', './test-invoice.pdf');
        console.log('Schema fields:', Object.keys(testSchema.fields));

        const startTime = Date.now();
        const result = await docAI.extract('./test-invoice.pdf', testSchema);
        const endTime = Date.now();

        console.log('\n✅ Extraction completed!');
        console.log('⏱️  Total time:', endTime - startTime, 'ms');
        console.log('Document ID:', result.documentId);
        console.log('Success:', result.success);

        if (result.success) {
            console.log('\n📊 Extraction Results:');
            console.log('Extracted data:', JSON.stringify(result.result.extractedData, null, 2));
            console.log('Confidence:', result.result.confidence);
            console.log('Confidence level:', result.result.getConfidenceLevel());
            console.log('Processing time:', result.result.processingTime, 'ms');
            console.log('Status:', result.result.status);
            console.log('Completion percentage:', result.result.getCompletionPercentage());
            console.log('Filled fields:', result.result.getFilledFieldsCount());
            console.log('Missing required fields:', result.result.getMissingRequiredFields());

            // Show detailed report
            console.log('\n📋 Detailed Report:');
            const detailedReport = result.result.getDetailedReport();
            console.log('Summary:', detailedReport.summary);

            // Show field details
            console.log('\n🔍 Field Details:');
            for (const [fieldName, fieldInfo] of Object.entries(detailedReport.fields)) {
                console.log(`  ${fieldName}:`);
                console.log(`    Value: ${fieldInfo.value}`);
                console.log(`    Required: ${fieldInfo.isRequired}`);
                console.log(`    Confidence: ${fieldInfo.confidence}`);
                console.log(`    Empty: ${fieldInfo.isEmpty}`);
            }

            // Validate business rules
            console.log('\n⚖️ Business Rules Validation:');
            const businessValidation = result.result.validateBusinessRules();
            console.log('Valid:', businessValidation.isValid);
            if (businessValidation.violations.length > 0) {
                console.log('Violations:');
                businessValidation.violations.forEach(violation => {
                    console.log(`  - ${violation.severity}: ${violation.message}`);
                });
            }

        } else {
            console.log('❌ Extraction failed');
            console.log('Error:', result.error);
        }

        // Show processing statistics
        console.log('\n📈 Processing Statistics:');
        const stats = docAI.getProcessingStats();
        console.log('Total processed:', stats.totalProcessed);
        console.log('Successful:', stats.successful);
        console.log('Failed:', stats.failed);
        console.log('Success rate:', stats.successRate.toFixed(2) + '%');
        console.log('Average confidence:', (stats.averageConfidence * 100).toFixed(2) + '%');
        console.log('Average processing time:', stats.averageProcessingTime.toFixed(0) + 'ms');

        // Batch processing
        const filePaths = ['./doc1.pdf', './doc2.pdf'];
        const results = await docAI.extractBulk(filePaths, testSchema);
        console.log('\n✅ Batch extraction completed!');
        console.log('Batch results:', results);

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.message.includes('API key')) {
            console.log('\n💡 To fix this:');
            console.log('  1. Get your API key from https://app.landing.ai/');
            console.log('  2. Set it as environment variable:');
            console.log('     export DOCUMENT_AI_API_KEY=your-actual-api-key');
        }

        if (error.message.includes('File not found')) {
            console.log('\n💡 To fix this:');
            console.log('  1. Run: node create-test-file.js');
            console.log('  2. Or use an existing PDF file');
        }

        if (error.message.includes('timeout')) {
            console.log('\n💡 To fix this:');
            console.log('  1. Increase timeout in the configuration');
            console.log('  2. Check your internet connection');
        }
    }
}

// Run the test
testExtraction().catch(console.error);