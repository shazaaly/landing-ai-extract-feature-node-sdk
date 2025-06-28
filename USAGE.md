# DocumentAI SDK - Quick Usage Guide

## 🚀 Get Started in 5 Minutes

### 1. Install & Setup

```bash
npm install extract-node-sdk
export DOCUMENT_AI_API_KEY=your-api-key-here
```

### 2. Basic Extraction

```javascript
const { DocumentAI } = require('extract-node-sdk');

const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY);

// Simple schema
const schema = {
    name: 'string',
    email: 'string',
    phone: 'string'
};

// Extract from PDF
const result = await docAI.extract('./document.pdf', schema);
console.log(result.result.extractedData);
```

## 📋 Common Use Cases

### Invoice Processing

```javascript
const invoiceSchema = {
    invoice_number: 'string',
    invoice_date: 'string',
    total_amount: 'string',
    vendor_name: 'string',
    due_date: 'string'
};

const result = await docAI.extract('./invoice.pdf', invoiceSchema);
```

### Form Data Extraction

```javascript
const formSchema = {
    first_name: 'string',
    last_name: 'string',
    date_of_birth: 'string',
    address: 'string',
    phone: 'string',
    email: 'string'
};

const result = await docAI.extract('./form.pdf', formSchema);
```

### Receipt Processing

```javascript
const receiptSchema = {
    store_name: 'string',
    date: 'string',
    total: 'string',
    items: 'array'
};

const result = await docAI.extract('./receipt.jpg', receiptSchema);
```

## 🔄 Batch Processing

```javascript
const filePaths = ['./doc1.pdf', './doc2.pdf', './doc3.pdf'];
const results = await docAI.extractBulk(filePaths, schema);

console.log(`Processed ${results.total} documents`);
console.log(`Success: ${results.completed}, Failed: ${results.failed}`);
```

## 🌐 URL-based Documents

```javascript
const result = await docAI.extract(
    'https://example.com/document.pdf',
    schema
);
```

## 🔍 Result Analysis

```javascript
const result = await docAI.extract('./document.pdf', schema);

if (result.success) {
    const extraction = result.result;

    // Check quality
    console.log('Confidence:', extraction.confidence);
    console.log('Completion:', extraction.getCompletionPercentage() + '%');

    // Check missing fields
    const missing = extraction.getMissingRequiredFields();
    if (missing.length > 0) {
        console.log('Missing:', missing);
    }

    // Get extracted data
    console.log('Data:', extraction.extractedData);
}
```

## ⚙️ Configuration

```javascript
const docAI = new DocumentAI(process.env.DOCUMENT_AI_API_KEY, {
    timeout: 30000,        // 30 seconds
    maxRetries: 3,         // Retry 3 times
    retryDelay: 1000       // Wait 1 second between retries
});
```

## 🛠️ Error Handling

```javascript
try {
    const result = await docAI.extract('./document.pdf', schema);

    if (result.success) {
        console.log('Success:', result.result.extractedData);
    } else {
        console.log('Failed:', result.error);
    }
} catch (error) {
    if (error.message.includes('API key')) {
        console.log('❌ Check your API key');
    } else if (error.message.includes('File not found')) {
        console.log('❌ Check file path');
    } else {
        console.log('❌ Error:', error.message);
    }
}
```

## 📊 Supported Files

- **PDFs**: Any length
- **Images**: JPG, PNG, TIFF, BMP, GIF, WebP, and more
- **URLs**: HTTP/HTTPS links to supported files

## 🧪 Testing

```bash
# Test connection
npm run example:simple

# Test extraction
npm run example:extraction

# Run full demo
npm run demo
```

## 📞 Need Help?

- Check error messages for specific guidance
- Use `docAI.testConnection()` to verify API access
- Validate schemas before extraction
- Monitor confidence scores for quality

---

**Full Documentation**: See `README.md` for complete examples and advanced features.