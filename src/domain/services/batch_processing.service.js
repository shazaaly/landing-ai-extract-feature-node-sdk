const { Document } = require('../entities/documents');

class BatchProcessingService {
    constructor() {
        // Load configuration from environment variables
        this.batchSize = parseInt(process.env.BATCH_SIZE) || 4;
        this.maxWorkers = parseInt(process.env.MAX_WORKERS) || 2;
        this.maxRetries = parseInt(process.env.MAX_RETRIES) || 80;
        this.maxRetryWaitTime = parseInt(process.env.MAX_RETRY_WAIT_TIME) || 30;
        this.retryLoggingStyle = process.env.RETRY_LOGGING_STYLE || 'log_msg';

        // Processing state
        this.activeWorkers = 0;
        this.processingQueue = [];
        this.completedDocuments = [];
        this.failedDocuments = [];
    }

    /**
     * Check if a document can be added to the batch processing queue
     */
    canAddToBatch(document) {
        // Validate document
        const validation = document.validate();
        if (!validation.isValid) {
            return {
                canAdd: false,
                reason: `Document validation failed: ${validation.errors.join(', ')}`,
                code: 'VALIDATION_FAILED'
            };
        }

        // Check if document can be processed
        const processingCheck = document.canBeProcessed();
        if (!processingCheck.canProcess) {
            return {
                canAdd: false,
                reason: processingCheck.reason,
                code: processingCheck.code
            };
        }

        // Check if batch is full
        if (this.processingQueue.length >= this.batchSize) {
            return {
                canAdd: false,
                reason: `Batch is full (${this.batchSize} documents)`,
                code: 'BATCH_FULL'
            };
        }

        // Check if document is already in queue
        const isAlreadyInQueue = this.processingQueue.some(doc => doc.id === document.id);
        if (isAlreadyInQueue) {
            return {
                canAdd: false,
                reason: 'Document is already in processing queue',
                code: 'ALREADY_IN_QUEUE'
            };
        }

        return {
            canAdd: true,
            reason: 'Document can be added to batch',
            code: 'READY_TO_ADD',
            batchInfo: {
                currentQueueSize: this.processingQueue.length,
                maxBatchSize: this.batchSize,
                availableSlots: this.batchSize - this.processingQueue.length
            }
        };
    }

    /**
     * Add document to processing queue
     */
    addToBatch(document) {
        const canAdd = this.canAddToBatch(document);
        if (!canAdd.canAdd) {
            throw new Error(`Cannot add document to batch: ${canAdd.reason}`);
        }

        this.processingQueue.push(document);
        this.logBatchStatus('Document added to batch', {
            documentId: document.id,
            queueSize: this.processingQueue.length,
            batchSize: this.batchSize
        });

        return {
            success: true,
            documentId: document.id,
            queuePosition: this.processingQueue.length,
            estimatedWaitTime: this.calculateEstimatedWaitTime()
        };
    }

    /**
     * Process batch of documents with worker management
     */
    async processBatch(extractionFunction) {
        if (this.processingQueue.length === 0) {
            return {
                processed: 0,
                completed: 0,
                failed: 0,
                message: 'No documents in queue to process'
            };
        }

        const batchToProcess = this.processingQueue.splice(0, this.batchSize);
        const results = {
            processed: batchToProcess.length,
            completed: 0,
            failed: 0,
            errors: []
        };

        this.logBatchStatus('Starting batch processing', {
            batchSize: batchToProcess.length,
            maxWorkers: this.maxWorkers,
            queueRemaining: this.processingQueue.length
        });

        // Process documents with worker concurrency control
        const chunks = this.chunkArray(batchToProcess, this.maxWorkers);

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (document) => {
                try {
                    // Mark document as processing
                    document.markAsProcessing();

                    // Process document
                    const result = await this.processDocument(document, extractionFunction);

                    if (result.success) {
                        document.markAsCompleted();
                        this.completedDocuments.push(document);
                        results.completed++;
                    } else {
                        document.markAsFailed();
                        this.failedDocuments.push(document);
                        results.failed++;
                        results.errors.push({
                            documentId: document.id,
                            error: result.error
                        });
                    }
                } catch (error) {
                    document.markAsFailed();
                    this.failedDocuments.push(document);
                    results.failed++;
                    results.errors.push({
                        documentId: document.id,
                        error: error.message
                    });
                }
            });

            // Wait for current chunk to complete before processing next chunk
            await Promise.all(chunkPromises);
        }

        this.logBatchStatus('Batch processing completed', {
            processed: results.processed,
            completed: results.completed,
            failed: results.failed,
            errors: results.errors.length
        });

        return results;
    }

    /**
     * Process individual document with retry logic
     */
    async processDocument(document, extractionFunction) {
        let lastError = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await extractionFunction(document);

                this.logRetryAttempt(document.id, attempt, 'SUCCESS', null);
                return { success: true, result };

            } catch (error) {
                lastError = error;

                this.logRetryAttempt(document.id, attempt, 'FAILED', error.message);

                // Check if we should retry
                if (!this.shouldRetry(error, attempt)) {
                    break;
                }

                // Wait before retry
                if (attempt < this.maxRetries) {
                    const waitTime = this.calculateRetryWaitTime(attempt);
                    await this.sleep(waitTime);
                }
            }
        }

        return {
            success: false,
            error: lastError?.message || 'Max retries exceeded',
            attempts: this.maxRetries
        };
    }

    /**
     * Determine if an error should trigger a retry
     */
    shouldRetry(error, attempt) {
        // Don't retry on validation errors or unsupported file types
        if (error.message.includes('VALIDATION_FAILED') ||
            error.message.includes('UNSUPPORTED_FILE_TYPE') ||
            error.message.includes('FILE_TOO_LARGE')) {
            return false;
        }

        // Don't retry on authentication errors
        if (error.message.includes('Invalid API key') ||
            error.message.includes('401')) {
            return false;
        }

        // Retry on network errors, timeouts, and server errors
        return attempt < this.maxRetries;
    }

    /**
     * Calculate exponential backoff wait time
     */
    calculateRetryWaitTime(attempt) {
        const baseWaitTime = Math.min(this.maxRetryWaitTime, 30); // Cap at 30 seconds
        const exponentialWait = Math.pow(2, attempt - 1) * 1000; // Start with 1 second
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter

        return Math.min(exponentialWait + jitter, baseWaitTime * 1000);
    }

    /**
     * Calculate estimated wait time for documents in queue
     */
    calculateEstimatedWaitTime() {
        const documentsInQueue = this.processingQueue.length;
        const estimatedTimePerDocument = 5; // 5 seconds per document (rough estimate)
        const workers = this.maxWorkers;

        return Math.ceil((documentsInQueue * estimatedTimePerDocument) / workers);
    }

    /**
     * Get batch processing statistics
     */
    getBatchStats() {
        return {
            configuration: {
                batchSize: this.batchSize,
                maxWorkers: this.maxWorkers,
                maxRetries: this.maxRetries,
                maxRetryWaitTime: this.maxRetryWaitTime,
                retryLoggingStyle: this.retryLoggingStyle
            },
            queue: {
                size: this.processingQueue.length,
                maxSize: this.batchSize,
                availableSlots: Math.max(0, this.batchSize - this.processingQueue.length)
            },
            processing: {
                activeWorkers: this.activeWorkers,
                maxWorkers: this.maxWorkers
            },
            results: {
                completed: this.completedDocuments.length,
                failed: this.failedDocuments.length,
                total: this.completedDocuments.length + this.failedDocuments.length
            }
        };
    }

    /**
     * Clear completed and failed documents
     */
    clearResults() {
        this.completedDocuments = [];
        this.failedDocuments = [];
    }

    /**
     * Reset batch processing state
     */
    reset() {
        this.processingQueue = [];
        this.completedDocuments = [];
        this.failedDocuments = [];
        this.activeWorkers = 0;
    }

    /**
     * Utility method to split array into chunks
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Utility method for sleep/delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log retry attempts based on configured logging style
     */
    logRetryAttempt(documentId, attempt, status, error) {
        if (this.retryLoggingStyle === 'log_msg') {
            const message = `Document ${documentId} - Attempt ${attempt}/${this.maxRetries} - ${status}`;
            if (error) {
                console.log(`${message} - Error: ${error}`);
            } else {
                console.log(message);
            }
        }
        // Could add other logging styles here (JSON, structured, etc.)
    }

    /**
     * Log batch status updates
     */
    logBatchStatus(message, data) {
        console.log(`[Batch Processing] ${message}`, data);
    }
}

module.exports = { BatchProcessingService };