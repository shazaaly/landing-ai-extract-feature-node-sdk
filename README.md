# DocumentAI Node.js SDK

A powerful, domain-driven Node.js SDK for extracting structured data from PDF documents and images using AI. Built with clean architecture principles and comprehensive validation.

## 🚀 Quick Start

### Installation

```bash
npm install extract-node-sdk
```

### Basic Usage

```javascript
const { DocumentAI } = require('extract-node-sdk');

// Initialize with your API key
const docAI = new DocumentAI('your-api-key-here');

// Define what you want to extract
const schema = {
    invoice_number: 'string',
    invoice_date: 'string',
    total_amount: 'string',
    vendor_name: 'string'
};

// Extract data from a PDF
const result = await docAI.extract('./invoice.pdf', schema);
console.log(result.result.extractedData);
```

## 📋 Features

- ✅ **Multiple File Types**: PDFs, images (JPEG, PNG, TIFF, etc.), URLs
- ✅ **Schema Validation**: Built-in validation with Zod
- ✅ **Batch Processing**: Process multiple files efficiently
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Business Rules**: Enforce domain-specific rules
- ✅ **Retry Logic**: Automatic retry with exponential backoff
- ✅ **Type Safety**: Full TypeScript support

## 🔧 Configuration

### Environment Variables

```bash
# API Configuration
export DOCUMENT_AI_API_KEY=your-api-key-here

# Batch Processing (Optional)
export BATCH_SIZE=4              # Files processed in parallel
export MAX_WORKERS=2             # Threads per file
export MAX_RETRIES=80            # Maximum retry attempts
export MAX_RETRY_WAIT_TIME=30    # Max wait time per retry (seconds)
export RETRY_LOGGING_STYLE=log_msg
```

### SDK Configuration

```javascript
const docAI = new DocumentAI('your-api-key', {
    timeout: 30000,        // Request timeout (ms)
    maxRetries: 3,         // Retry attempts
    retryDelay: 1000,      // Base retry delay (ms)
    baseUrl: 'https://api.va.landing.ai/v1/tools/agentic-document-analysis'
});
```

## 📄 Schema Definition

### Simple Schema

```javascript
const simpleSchema = {
    name: 'string',
    email: 'string',
    phone: 'string',
    age: 'number'
};
```

### Advanced Schema with Validation

```javascript
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
    required: ['invoice_number', 'total_amount'],
    additionalProperties: false,
    version: '1.0.0'
};
```

## 📖 Usage Examples

### 1. Single Document Extraction

```javascript
const { DocumentAI } = require('extract-node-sdk');

async function extractInvoice() {
    const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);

    const schema = {
        invoice_number: 'string',
        invoice_date: 'string',
        total_amount: 'string',
        vendor_name: 'string'
    };

    try {
        const result = await docAI.extract('./invoice.pdf', schema);

        if (result.success) {
            console.log('Extracted data:', result.result.extractedData);
            console.log('Confidence:', result.result.confidence);
            console.log('Processing time:', result.result.processingTime, 'ms');
        }
    } catch (error) {
        console.error('Extraction failed:', error.message);
    }
}
```

### 2. Batch Processing

```javascript
async function processMultipleInvoices() {
    const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);

    const filePaths = [
        './invoice1.pdf',
        './invoice2.pdf',
        './invoice3.pdf'
    ];

    const schema = {
        invoice_number: 'string',
        total_amount: 'string',
        vendor_name: 'string'
    };

    try {
        const results = await docAI.extractBulk(filePaths, schema);

        console.log(`Processed ${results.total} documents`);
        console.log(`Success: ${results.completed}, Failed: ${results.failed}`);

        results.results.forEach(result => {
            console.log(`Document ${result.documentId}:`, result.extractedData);
        });
    } catch (error) {
        console.error('Batch processing failed:', error.message);
    }
}
```

### 3. URL-based Documents

```javascript
async function extractFromURL() {
    const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);

    const schema = {
        name: 'string',
        email: 'string',
        phone: 'string'
    };

    try {
        const result = await docAI.extract(
            'https://example.com/document.pdf',
            schema
        );

        console.log('Extracted from URL:', result.result.extractedData);
    } catch (error) {
        console.error('URL extraction failed:', error.message);
    }
}
```

### 4. Advanced Schema Usage

```javascript
const { DocumentAI, Schema } = require('extract-node-sdk');

async function advancedExtraction() {
    const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);

    // Create a schema with validation
    const schema = new Schema({
        customer_name: {
            type: 'string',
            validation: {
                minLength: 2,
                maxLength: 100
            }
        },
        order_number: {
            type: 'string',
            validation: {
                pattern: '^ORD-\\d{8}$'
            }
        },
        total: {
            type: 'number',
            validation: {
                min: 0
            }
        }
    }, {
        required: ['customer_name', 'order_number'],
        version: '1.0.0'
    });

    try {
        const result = await docAI.extract('./order.pdf', schema);

        // Validate business rules
        const businessValidation = result.result.validateBusinessRules();
        if (!businessValidation.isValid) {
            console.log('Business rule violations:', businessValidation.violations);
        }

        console.log('Extracted data:', result.result.extractedData);
    } catch (error) {
        console.error('Advanced extraction failed:', error.message);
    }
}
```

### 5. Error Handling

```javascript
async function robustExtraction() {
    const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);

    try {
        // Test connection first
        const connectionTest = await docAI.testConnection();
        if (!connectionTest.success) {
            console.log('Connection failed:', connectionTest.message);
            return;
        }

        // Validate schema before extraction
        const schemaValidation = docAI.validateSchema(mySchema);
        if (!schemaValidation.isValid) {
            console.log('Schema validation failed:', schemaValidation.error);
            return;
        }

        const result = await docAI.extract('./document.pdf', mySchema);

        if (result.success) {
            const extractionResult = result.result;

            // Check confidence
            if (extractionResult.confidence < 0.7) {
                console.log('Low confidence extraction:', extractionResult.confidence);
            }

            // Check completion
            if (extractionResult.getCompletionPercentage() < 80) {
                console.log('Incomplete extraction:', extractionResult.getCompletionPercentage() + '%');
            }

            // Check missing required fields
            const missingFields = extractionResult.getMissingRequiredFields();
            if (missingFields.length > 0) {
                console.log('Missing required fields:', missingFields);
            }
        }

    } catch (error) {
        if (error.message.includes('API key')) {
            console.log('Please check your API key');
        } else if (error.message.includes('File not found')) {
            console.log('Please check the file path');
        } else if (error.message.includes('timeout')) {
            console.log('Request timed out, try again');
        } else {
            console.log('Unexpected error:', error.message);
        }
    }
}
```

## 🔍 Result Analysis

### Understanding Extraction Results

```javascript
const result = await docAI.extract('./document.pdf', schema);

// Basic result info
console.log('Success:', result.success);
console.log('Document ID:', result.documentId);

if (result.success) {
    const extraction = result.result;

    // Confidence and quality
    console.log('Confidence:', extraction.confidence);
    console.log('Confidence level:', extraction.getConfidenceLevel()); // high/medium/low/very_low
    console.log('Completion percentage:', extraction.getCompletionPercentage());

    // Field information
    console.log('Filled fields:', extraction.getFilledFieldsCount());
    console.log('Missing required fields:', extraction.getMissingRequiredFields());

    // Detailed field analysis
    const fieldInfo = extraction.getField('invoice_number');
    console.log('Invoice number field:', {
        value: fieldInfo.value,
        isRequired: fieldInfo.isRequired,
        confidence: fieldInfo.confidence
    });

    // Business rules validation
    const businessValidation = extraction.validateBusinessRules();
    console.log('Business rules valid:', businessValidation.isValid);

    // Detailed report
    const detailedReport = extraction.getDetailedReport();
    console.log('Detailed report:', detailedReport);
}
```

## 📊 Supported File Types

### PDF Files
- Any length PDF documents
- Local files and URLs

### Image Files (OpenCV Supported)
- **Common**: JPG, JPEG, PNG, TIFF, BMP, GIF, WebP
- **Advanced**: PPM, PGM, PBM, SR, RAS, JP2, J2K, JPX, JPF, JPM, MJ2, TGA, EXR, HDR, PIC

### URLs
- HTTP and HTTPS protocols
- Must point to supported file types

## ⚙️ Advanced Configuration

### Batch Processing Settings

```javascript
// Set via environment variables
process.env.BATCH_SIZE = '4';              // Files per batch
process.env.MAX_WORKERS = '2';             // Workers per batch
process.env.MAX_RETRIES = '80';            // Max retries
process.env.MAX_RETRY_WAIT_TIME = '30';    // Max wait time (seconds)
process.env.RETRY_LOGGING_STYLE = 'log_msg'; // Logging style
```

### Custom Error Handling

```javascript
class DocumentAIError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}

// Handle specific error types
try {
    const result = await docAI.extract('./document.pdf', schema);
} catch (error) {
    if (error.message.includes('API key')) {
        throw new DocumentAIError('Invalid API key', 'AUTH_ERROR', { apiKey: 'invalid' });
    } else if (error.message.includes('File not found')) {
        throw new DocumentAIError('File not found', 'FILE_ERROR', { path: './document.pdf' });
    }
    throw error;
}
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Test with real API
npm run example:extraction

# Test basic functionality
npm run example:simple

# Run complete demo
npm run demo
```

## 📈 Performance Tips

1. **Use batch processing** for multiple files
2. **Set appropriate timeouts** based on file sizes
3. **Validate schemas** before extraction
4. **Handle errors gracefully** with retry logic
5. **Monitor confidence scores** for quality assurance

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid API key"**
   - Check your API key at https://app.landing.ai/
   - Ensure it's properly set as environment variable

2. **"File not found"**
   - Verify file path is correct
   - Check file permissions
   - Ensure file exists

3. **"Request timeout"**
   - Increase timeout in configuration
   - Check internet connection
   - Try with smaller files

4. **"Schema validation failed"**
   - Check schema format
   - Ensure all required fields are defined
   - Validate field types

### Getting Help

- Check the error messages for specific guidance
- Use the connection test to verify API access
- Validate schemas before extraction
- Monitor processing statistics for insights

## 📄 License

ISC License
