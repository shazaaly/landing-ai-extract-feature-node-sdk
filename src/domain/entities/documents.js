const { FilePath } = require('../value-objects/file_path');

class Document {
    constructor(id, filePath, mimeType, size, options = {}) {
        this.id = id;
        this.filePath = new FilePath(filePath);
        this.mimeType = mimeType || this.filePath.getMimeType();
        this.size = size;
        this.createdAt = new Date();

        // Batch processing configuration
        this.batchSize = options.batchSize || parseInt(process.env.BATCH_SIZE) || 4;
        this.maxWorkers = options.maxWorkers || parseInt(process.env.MAX_WORKERS) || 2;
        this.maxRetries = options.maxRetries || parseInt(process.env.MAX_RETRIES) || 80;
        this.maxRetryWaitTime = options.maxRetryWaitTime || parseInt(process.env.MAX_RETRY_WAIT_TIME) || 30;
        this.retryLoggingStyle = options.retryLoggingStyle || process.env.RETRY_LOGGING_STYLE || 'log_msg';

        // Processing state
        this.processingAttempts = 0;
        this.lastProcessingAttempt = null;
        this.processingStatus = 'pending'; // pending, processing, completed, failed
    }

    /**
     * Determines if the document can be processed based on business rules
     * and batch processing configuration
     */
    canBeProcessed() {
        // Check if file exists and is accessible (for local files)
        if (this.filePath.isLocalPath() && !this.filePath.exists()) {
            return {
                canProcess: false,
                reason: 'File does not exist or is not accessible',
                code: 'FILE_NOT_FOUND'
            };
        }

        // Check file size limits (business rule) - only for local files
        if (this.filePath.isLocalPath()) {
            const maxFileSize = 50 * 1024 * 1024; // 50MB limit
            if (this.size && this.size > maxFileSize) {
                return {
                    canProcess: false,
                    reason: `File size ${this.size} bytes exceeds maximum allowed size of ${maxFileSize} bytes`,
                    code: 'FILE_TOO_LARGE'
                };
            }
        }

        // Check supported MIME types (business rule)
        const supportedTypes = [
            // PDF files
            'application/pdf',

            // Image files supported by OpenCV
            'image/jpeg',
            'image/png',
            'image/tiff',
            'image/bmp',
            'image/gif',
            'image/webp',

            // Additional OpenCV supported formats
            'image/x-portable-pixmap',
            'image/x-portable-graymap',
            'image/x-portable-bitmap',
            'image/x-sun-raster',
            'image/x-cmu-raster',
            'image/jp2',
            'image/jpm',
            'image/mj2',
            'image/x-tga',
            'image/x-exr',
            'image/vnd.radiance',
            'image/x-pict'
        ];

        if (!supportedTypes.includes(this.mimeType)) {
            return {
                canProcess: false,
                reason: `Unsupported file type: ${this.mimeType}`,
                code: 'UNSUPPORTED_FILE_TYPE'
            };
        }

        // Check if document is already being processed
        if (this.processingStatus === 'processing') {
            return {
                canProcess: false,
                reason: 'Document is currently being processed',
                code: 'ALREADY_PROCESSING'
            };
        }

        // Check if document has already been processed successfully
        if (this.processingStatus === 'completed') {
            return {
                canProcess: false,
                reason: 'Document has already been processed successfully',
                code: 'ALREADY_COMPLETED'
            };
        }

        // Check retry limits based on MAX_RETRIES configuration
        if (this.processingAttempts >= this.maxRetries) {
            return {
                canProcess: false,
                reason: `Maximum retry attempts (${this.maxRetries}) exceeded`,
                code: 'MAX_RETRIES_EXCEEDED'
            };
        }

        // Check if enough time has passed since last attempt (rate limiting)
        if (this.lastProcessingAttempt) {
            const timeSinceLastAttempt = Date.now() - this.lastProcessingAttempt.getTime();
            const minWaitTime = this.maxRetryWaitTime * 1000; // Convert to milliseconds

            if (timeSinceLastAttempt < minWaitTime) {
                return {
                    canProcess: false,
                    reason: `Rate limit: must wait ${Math.ceil((minWaitTime - timeSinceLastAttempt) / 1000)} more seconds before retry`,
                    code: 'RATE_LIMITED'
                };
            }
        }

        // Check if batch processing capacity is available
        if (this.batchSize <= 0) {
            return {
                canProcess: false,
                reason: 'Batch size must be greater than 0',
                code: 'INVALID_BATCH_SIZE'
            };
        }

        if (this.maxWorkers <= 0) {
            return {
                canProcess: false,
                reason: 'Maximum workers must be greater than 0',
                code: 'INVALID_MAX_WORKERS'
            };
        }

        return {
            canProcess: true,
            reason: 'Document can be processed',
            code: 'READY_TO_PROCESS',
            fileInfo: {
                isUrl: this.filePath.isUrlPath(),
                extension: this.filePath.getExtension(),
                mimeType: this.mimeType,
                size: this.size
            },
            batchConfig: {
                batchSize: this.batchSize,
                maxWorkers: this.maxWorkers,
                maxRetries: this.maxRetries,
                maxRetryWaitTime: this.maxRetryWaitTime,
                retryLoggingStyle: this.retryLoggingStyle
            }
        };
    }

    /**
     * Mark document as processing and increment attempt counter
     */
    markAsProcessing() {
        this.processingStatus = 'processing';
        this.processingAttempts++;
        this.lastProcessingAttempt = new Date();
    }

    /**
     * Mark document as completed
     */
    markAsCompleted() {
        this.processingStatus = 'completed';
    }

    /**
     * Mark document as failed
     */
    markAsFailed() {
        this.processingStatus = 'failed';
    }

    /**
     * Reset document processing state
     */
    resetProcessingState() {
        this.processingStatus = 'pending';
        this.processingAttempts = 0;
        this.lastProcessingAttempt = null;
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            id: this.id,
            status: this.processingStatus,
            attempts: this.processingAttempts,
            lastAttempt: this.lastProcessingAttempt,
            createdAt: this.createdAt,
            fileInfo: {
                path: this.filePath.value,
                isUrl: this.filePath.isUrlPath(),
                extension: this.filePath.getExtension(),
                mimeType: this.mimeType,
                size: this.size
            },
            batchConfig: {
                batchSize: this.batchSize,
                maxWorkers: this.maxWorkers,
                maxRetries: this.maxRetries,
                maxRetryWaitTime: this.maxRetryWaitTime,
                retryLoggingStyle: this.retryLoggingStyle
            }
        };
    }

    /**
     * Validate document properties
     */
    validate() {
        const errors = [];

        if (!this.id) {
            errors.push('Document ID is required');
        }

        if (!this.filePath) {
            errors.push('File path is required');
        }

        if (!this.mimeType) {
            errors.push('MIME type is required');
        }

        if (this.size && this.size < 0) {
            errors.push('File size cannot be negative');
        }

        if (this.batchSize <= 0) {
            errors.push('Batch size must be greater than 0');
        }

        if (this.maxWorkers <= 0) {
            errors.push('Maximum workers must be greater than 0');
        }

        if (this.maxRetries < 0) {
            errors.push('Maximum retries cannot be negative');
        }

        if (this.maxRetryWaitTime < 0) {
            errors.push('Maximum retry wait time cannot be negative');
        }

        // Validate file path
        const filePathValidation = this.filePath.validateForProcessing();
        if (!filePathValidation.isValid) {
            errors.push(...filePathValidation.errors);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a new Document instance with updated configuration
     */
    withConfiguration(config) {
        return new Document(this.id, this.filePath.value, this.mimeType, this.size, {
            batchSize: config.batchSize || this.batchSize,
            maxWorkers: config.maxWorkers || this.maxWorkers,
            maxRetries: config.maxRetries || this.maxRetries,
            maxRetryWaitTime: config.maxRetryWaitTime || this.maxRetryWaitTime,
            retryLoggingStyle: config.retryLoggingStyle || this.retryLoggingStyle
        });
    }

    /**
     * Check if document is a URL
     */
    isUrlDocument() {
        return this.filePath.isUrlPath();
    }

    /**
     * Check if document is a local file
     */
    isLocalDocument() {
        return this.filePath.isLocalPath();
    }

    /**
     * Get file type category
     */
    getFileTypeCategory() {
        const extension = this.filePath.getExtension();

        if (extension === '.pdf') {
            return 'pdf';
        }

        const imageExtensions = [
            '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.gif', '.webp',
            '.ppm', '.pgm', '.pbm', '.sr', '.ras', '.jp2', '.j2k', '.jpx',
            '.jpf', '.jpm', '.mj2', '.tga', '.exr', '.hdr', '.pic'
        ];

        if (imageExtensions.includes(extension)) {
            return 'image';
        }

        return 'unknown';
    }

    /**
     * Get document summary for logging
     */
    getSummary() {
        return {
            id: this.id,
            type: this.getFileTypeCategory(),
            isUrl: this.isUrlDocument(),
            extension: this.filePath.getExtension(),
            size: this.size,
            status: this.processingStatus,
            attempts: this.processingAttempts
        };
    }
}

module.exports = { Document };
