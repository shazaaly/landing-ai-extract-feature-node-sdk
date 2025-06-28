const { Document } = require('./src/domain/entities/documents');
const { FilePath } = require('./src/domain/value-objects/file_path');
const { BatchProcessingService } = require('./src/domain/services/batch_processing.service');

// Set environment variables for batch processing
process.env.BATCH_SIZE = '4';
process.env.MAX_WORKERS = '2';
process.env.MAX_RETRIES = '80';
process.env.MAX_RETRY_WAIT_TIME = '30';
process.env.RETRY_LOGGING_STYLE = 'log_msg';

async function demonstrateEnhancedFileSupport() {
    console.log('🚀 DocumentAI Enhanced File Support Demo\n');

    // Example 1: Local PDF file
    console.log('📄 Example 1: Local PDF File');
    try {
        const pdfDocument = new Document(
            'doc-001',
            './example.pdf',
            'application/pdf',
            1024000 // 1MB
        );

        const pdfCheck = pdfDocument.canBeProcessed();
        console.log('Can process PDF:', pdfCheck.canProcess);
        console.log('File info:', pdfCheck.fileInfo);
        console.log('File type category:', pdfDocument.getFileTypeCategory());
        console.log('Summary:', pdfDocument.getSummary());
    } catch (error) {
        console.log('PDF Error:', error.message);
    }
    console.log('');

    // Example 2: Local image file (OpenCV supported)
    console.log('🖼️ Example 2: Local Image File (OpenCV Supported)');
    try {
        const imageDocument = new Document(
            'doc-002',
            './image.jpg',
            'image/jpeg',
            512000 // 512KB
        );

        const imageCheck = imageDocument.canBeProcessed();
        console.log('Can process image:', imageCheck.canProcess);
        console.log('File info:', imageCheck.fileInfo);
        console.log('File type category:', imageDocument.getFileTypeCategory());
        console.log('Summary:', imageDocument.getSummary());
    } catch (error) {
        console.log('Image Error:', error.message);
    }
    console.log('');

    // Example 3: URL pointing to PDF
    console.log('🌐 Example 3: URL to PDF File');
    try {
        const urlPdfDocument = new Document(
            'doc-003',
            'https://example.com/document.pdf',
            'application/pdf'
        );

        const urlPdfCheck = urlPdfDocument.canBeProcessed();
        console.log('Can process URL PDF:', urlPdfCheck.canProcess);
        console.log('File info:', urlPdfCheck.fileInfo);
        console.log('Is URL document:', urlPdfDocument.isUrlDocument());
        console.log('URL info:', urlPdfDocument.filePath.getUrlInfo());
        console.log('Summary:', urlPdfDocument.getSummary());
    } catch (error) {
        console.log('URL PDF Error:', error.message);
    }
    console.log('');

    // Example 4: URL pointing to image
    console.log('🖼️ Example 4: URL to Image File');
    try {
        const urlImageDocument = new Document(
            'doc-004',
            'https://example.com/image.png',
            'image/png'
        );

        const urlImageCheck = urlImageDocument.canBeProcessed();
        console.log('Can process URL image:', urlImageCheck.canProcess);
        console.log('File info:', urlImageCheck.fileInfo);
        console.log('Is URL document:', urlImageDocument.isUrlDocument());
        console.log('Summary:', urlImageDocument.getSummary());
    } catch (error) {
        console.log('URL Image Error:', error.message);
    }
    console.log('');

    // Example 5: Advanced OpenCV format
    console.log('🎨 Example 5: Advanced OpenCV Format (TIFF)');
    try {
        const tiffDocument = new Document(
            'doc-005',
            './document.tiff',
            'image/tiff',
            2048000 // 2MB
        );

        const tiffCheck = tiffDocument.canBeProcessed();
        console.log('Can process TIFF:', tiffCheck.canProcess);
        console.log('File info:', tiffCheck.fileInfo);
        console.log('MIME type:', tiffDocument.filePath.getMimeType());
        console.log('Summary:', tiffDocument.getSummary());
    } catch (error) {
        console.log('TIFF Error:', error.message);
    }
    console.log('');

    // Example 6: Batch Processing with different file types
    console.log('📦 Example 6: Batch Processing with Mixed File Types');
    try {
        const batchService = new BatchProcessingService();

        const documents = [
            new Document('doc-006', './invoice.pdf', 'application/pdf', 1536000),
            new Document('doc-007', './receipt.jpg', 'image/jpeg', 256000),
            new Document('doc-008', 'https://example.com/contract.pdf', 'application/pdf'),
            new Document('doc-009', './scan.tiff', 'image/tiff', 1024000)
        ];

        console.log('Batch configuration:', batchService.getBatchStats().configuration);

        // Add documents to batch
        for (const doc of documents) {
            try {
                const addResult = batchService.addToBatch(doc);
                console.log(`Added ${doc.getFileTypeCategory()} document:`, addResult.documentId);
            } catch (error) {
                console.log(`Failed to add document ${doc.id}:`, error.message);
            }
        }

        console.log('Batch queue size:', batchService.getBatchStats().queue.size);
        console.log('Batch stats:', batchService.getBatchStats());

    } catch (error) {
        console.log('Batch Processing Error:', error.message);
    }
    console.log('');

    // Example 7: File Path Validation
    console.log('✅ Example 7: File Path Validation');
    try {
        const testPaths = [
            './valid.pdf',
            'https://example.com/image.jpg',
            './invalid..path',
            'ftp://example.com/file.pdf', // Unsupported protocol
            './unsupported.txt'
        ];

        for (const testPath of testPaths) {
            try {
                const filePath = new FilePath(testPath);
                const validation = filePath.validateForProcessing();
                console.log(`${testPath}: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
                if (!validation.isValid) {
                    console.log('  Errors:', validation.errors);
                }
            } catch (error) {
                console.log(`${testPath}: ❌ Error - ${error.message}`);
            }
        }
    } catch (error) {
        console.log('Validation Error:', error.message);
    }
    console.log('');

    // Example 8: Supported File Types Summary
    console.log('📋 Example 8: Supported File Types Summary');
    const supportedTypes = [
        { extension: '.pdf', type: 'PDF Document', mime: 'application/pdf' },
        { extension: '.jpg', type: 'JPEG Image', mime: 'image/jpeg' },
        { extension: '.jpeg', type: 'JPEG Image', mime: 'image/jpeg' },
        { extension: '.png', type: 'PNG Image', mime: 'image/png' },
        { extension: '.tiff', type: 'TIFF Image', mime: 'image/tiff' },
        { extension: '.tif', type: 'TIFF Image', mime: 'image/tiff' },
        { extension: '.bmp', type: 'BMP Image', mime: 'image/bmp' },
        { extension: '.gif', type: 'GIF Image', mime: 'image/gif' },
        { extension: '.webp', type: 'WebP Image', mime: 'image/webp' },
        { extension: '.jp2', type: 'JPEG 2000 Image', mime: 'image/jp2' },
        { extension: '.exr', type: 'OpenEXR Image', mime: 'image/x-exr' },
        { extension: '.hdr', type: 'HDR Image', mime: 'image/vnd.radiance' }
    ];

    console.log('Supported file types:');
    supportedTypes.forEach(({ extension, type, mime }) => {
        console.log(`  ${extension} - ${type} (${mime})`);
    });

    console.log('\n✅ Enhanced file support demonstration completed!');
}

// Run the demonstration
demonstrateEnhancedFileSupport().catch(console.error);