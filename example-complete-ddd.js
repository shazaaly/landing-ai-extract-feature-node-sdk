const { DocumentAIService } = require('./src/domain/application/document_ai.service');
const { Schema } = require('./src/domain/entities/schema');
const { Document } = require('./src/domain/entities/documents');
const { ExtractionResult } = require('./src/domain/entities/extraction');

// Set environment variables for batch processing
process.env.BATCH_SIZE = '4';
process.env.MAX_WORKERS = '2';
process.env.MAX_RETRIES = '80';
process.env.MAX_RETRY_WAIT_TIME = '30';
process.env.RETRY_LOGGING_STYLE = 'log_msg';

async function demonstrateCompleteDDD() {
    console.log('🚀 DocumentAI Complete Domain-Driven Design Demo\n');

    // Initialize the service
    const service = new DocumentAIService({
        apiKey: process.env.DOCUMENT_AI_API_KEY || 'your-api-key-here',
        timeout: 30000,
        maxRetries: 3
    });

    // Example 1: Simple Schema Definition
    console.log('📋 Example 1: Simple Schema Definition');
    const simpleSchema = {
        name: 'string',
        email: 'string',
        phone: 'string',
        age: 'number'
    };

    const schemaValidation = service.validateSchema(simpleSchema);
    console.log('Schema validation:', schemaValidation.isValid ? '✅ Valid' : '❌ Invalid');
    if (schemaValidation.isValid) {
        console.log('Schema summary:', schemaValidation.summary);
    }
    console.log('');

    // Example 2: Advanced Schema with Validation
    console.log('🔧 Example 2: Advanced Schema with Validation');
    const advancedSchema = {
        fields: {
            invoice_number: {
                type: 'string',
                validation: {
                    pattern: '^INV-\\d{6}$',
                    minLength: 10,
                    maxLength: 15
                }
            },
            invoice_date: {
                type: 'date'
            },
            total_amount: {
                type: 'number',
                validation: {
                    min: 0,
                    max: 1000000
                }
            },
            vendor_name: {
                type: 'string',
                validation: {
                    minLength: 2,
                    maxLength: 100
                }
            },
            line_items: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        description: { type: 'string' },
                        quantity: { type: 'number' },
                        unit_price: { type: 'number' }
                    }
                },
                validation: {
                    minItems: 1,
                    maxItems: 100
                }
            }
        },
        required: ['invoice_number', 'invoice_date', 'total_amount'],
        additionalProperties: false,
        version: '2.0.0'
    };

    const advancedSchemaValidation = service.validateSchema(advancedSchema);
    console.log('Advanced schema validation:', advancedSchemaValidation.isValid ? '✅ Valid' : '❌ Invalid');
    if (advancedSchemaValidation.isValid) {
        console.log('Advanced schema summary:', advancedSchemaValidation.summary);
    }
    console.log('');

    // Example 3: Document Entity Creation and Validation
    console.log('📄 Example 3: Document Entity Creation and Validation');
    try {
        const document = service.createDocument('./invoice.pdf', {
            mimeType: 'application/pdf',
            size: 1024000
        });

        console.log('Document created:', document.getSummary());

        const canProcess = document.canBeProcessed();
        console.log('Can process document:', canProcess.canProcess);
        if (!canProcess.canProcess) {
            console.log('Reason:', canProcess.reason);
        }

        console.log('File type category:', document.getFileTypeCategory());
        console.log('Is URL document:', document.isUrlDocument());
    } catch (error) {
        console.log('Document creation error:', error.message);
    }
    console.log('');

    // Example 4: URL Document Handling
    console.log('🌐 Example 4: URL Document Handling');
    try {
        const urlDocument = service.createDocument('https://example.com/document.pdf', {
            mimeType: 'application/pdf'
        });

        console.log('URL document created:', urlDocument.getSummary());
        console.log('Is URL document:', urlDocument.isUrlDocument());
        console.log('URL info:', urlDocument.filePath.getUrlInfo());
    } catch (error) {
        console.log('URL document creation error:', error.message);
    }
    console.log('');

    // Example 5: Schema Entity Operations
    console.log('🏗️ Example 5: Schema Entity Operations');
    try {
        const schema = new Schema({
            customer_name: { type: 'string' },
            order_number: { type: 'string' },
            total: { type: 'number' }
        }, {
            required: ['customer_name', 'order_number'],
            version: '1.0.0'
        });

        console.log('Schema created successfully');
        console.log('Schema summary:', schema.getSummary());
        console.log('Required fields:', schema.getRequiredFields());
        console.log('Field names:', schema.getFieldNames());
        console.log('Is field required (customer_name):', schema.isFieldRequired('customer_name'));
        console.log('Is field required (total):', schema.isFieldRequired('total'));

        // Test data validation
        const testData = {
            customer_name: 'John Doe',
            order_number: 'ORD-12345',
            total: 150.50
        };

        const validation = schema.validateData(testData);
        console.log('Data validation:', validation.isValid ? '✅ Valid' : '❌ Invalid');
        if (!validation.isValid) {
            console.log('Validation errors:', validation.errors);
        }

        // Test JSON Schema conversion
        const jsonSchema = schema.toJsonSchema();
        console.log('JSON Schema generated:', Object.keys(jsonSchema.properties).length, 'properties');

    } catch (error) {
        console.log('Schema operations error:', error.message);
    }
    console.log('');

    // Example 6: Extraction Result Entity
    console.log('📊 Example 6: Extraction Result Entity');
    try {
        const testSchema = new Schema({
            name: { type: 'string' },
            email: { type: 'string' },
            age: { type: 'number' }
        }, {
            required: ['name', 'email']
        });

        const extractedData = {
            name: 'Jane Smith',
            email: 'jane@example.com',
            age: 30
        };

        const result = new ExtractionResult('doc-001', extractedData, testSchema, {
            confidence: 0.95,
            processingTime: 2500
        });

        console.log('Extraction result created');
        console.log('Result summary:', result.getSummary());
        console.log('Confidence level:', result.getConfidenceLevel());
        console.log('Completion percentage:', result.getCompletionPercentage());
        console.log('Is valid:', result.isValid());
        console.log('Has warnings:', result.hasWarnings());

        // Test field operations
        const nameField = result.getField('name');
        console.log('Name field:', nameField);

        // Test business rules validation
        const businessValidation = result.validateBusinessRules();
        console.log('Business rules validation:', businessValidation.isValid ? '✅ Valid' : '❌ Invalid');
        if (businessValidation.violations.length > 0) {
            console.log('Violations:', businessValidation.violations);
        }

    } catch (error) {
        console.log('Extraction result error:', error.message);
    }
    console.log('');

    // Example 7: Service Configuration and Capabilities
    console.log('⚙️ Example 7: Service Configuration and Capabilities');
    console.log('Service configuration:', service.getConfiguration());
    console.log('Supported file types:', service.getSupportedFileTypes());

    // Test connection (will fail without real API key)
    try {
        const connectionTest = await service.testConnection();
        console.log('Connection test:', connectionTest);
    } catch (error) {
        console.log('Connection test failed (expected without real API key):', error.message);
    }
    console.log('');

    // Example 8: Simple Schema Creation
    console.log('🎯 Example 8: Simple Schema Creation');
    const fieldNames = ['invoice_number', 'date', 'amount', 'vendor'];
    const simpleSchema2 = service.createSimpleSchema(fieldNames, {
        required: ['invoice_number', 'amount'],
        defaultType: 'string',
        validationRules: {
            amount: { min: 0, max: 1000000 }
        }
    });

    console.log('Simple schema created');
    console.log('Schema summary:', simpleSchema2.getSummary());
    console.log('');

    // Example 9: Batch Processing Configuration
    console.log('📦 Example 9: Batch Processing Configuration');
    const batchStats = service.getConfiguration().batchService;
    console.log('Batch processing configuration:');
    console.log('  Batch size:', batchStats.batchSize);
    console.log('  Max workers:', batchStats.maxWorkers);
    console.log('  Max retries:', batchStats.maxRetries);
    console.log('  Max retry wait time:', batchStats.maxRetryWaitTime);
    console.log('  Retry logging style:', batchStats.retryLoggingStyle);
    console.log('');

    // Example 10: Error Handling and Validation
    console.log('⚠️ Example 10: Error Handling and Validation');

    // Test invalid schema
    const invalidSchema = {
        fields: {
            invalid_field: {
                type: 'invalid_type' // Invalid type
            }
        }
    };

    const invalidSchemaValidation = service.validateSchema(invalidSchema);
    console.log('Invalid schema validation:', invalidSchemaValidation.isValid ? '✅ Valid' : '❌ Invalid');
    if (!invalidSchemaValidation.isValid) {
        console.log('Invalid schema error:', invalidSchemaValidation.error);
    }

    // Test invalid document path
    try {
        const invalidDocument = service.createDocument('./nonexistent.pdf');
        console.log('Invalid document created (should not happen)');
    } catch (error) {
        console.log('Invalid document error (expected):', error.message);
    }
    console.log('');

    console.log('✅ Complete DDD demonstration finished!');
    console.log('\n📚 Key Features Demonstrated:');
    console.log('  • Domain Entities (Document, Schema, ExtractionResult)');
    console.log('  • Value Objects (FilePath)');
    console.log('  • Domain Services (BatchProcessingService)');
    console.log('  • Application Services (DocumentAIService)');
    console.log('  • Infrastructure (DocumentAIRepository)');
    console.log('  • Schema validation with Zod');
    console.log('  • Business rules enforcement');
    console.log('  • Error handling and validation');
    console.log('  • Batch processing configuration');
    console.log('  • URL and local file support');
    console.log('  • Comprehensive file type support');
}

// Run the demonstration
demonstrateCompleteDDD().catch(console.error);