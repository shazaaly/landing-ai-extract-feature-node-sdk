const { Document } = require('../entities/documents');
const { Schema } = require('../entities/schema');
const { ExtractionResult } = require('../entities/extraction');
const { BatchProcessingService } = require('../services/batch_processing.service');
const { DocumentAIRepository } = require('../../infrastructure/repositories/document_ai.repository');

class DocumentAIService {
    constructor(config) {
        this.config = {
            apiKey: config.apiKey,
            baseUrl: 'https://api.va.landing.ai/v1/tools/agentic-document-analysis',
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };

        // Initialize dependencies
        this.repository = new DocumentAIRepository(this.config);
        this.batchService = new BatchProcessingService();

        // Processing state
        this.processingQueue = [];
        this.results = new Map();
        this.errors = new Map();
    }

    /**
     * Extract data from a single document
     */
    async extractData(filePath, schemaDefinition, options = {}) {
        const startTime = Date.now();

        try {
            // Create document entity
            const document = this.createDocument(filePath, options);

            // Create schema entity
            const schema = this.createSchema(schemaDefinition);

            // Validate document can be processed
            const canProcess = document.canBeProcessed();
            if (!canProcess.canProcess) {
                throw new Error(`Document cannot be processed: ${canProcess.reason}`);
            }

            // Mark document as processing
            document.markAsProcessing();

            // Extract data using repository
            const extractionResponse = await this.repository.extract(document, schema);

            // Create extraction result
            const result = new ExtractionResult(
                document.id,
                extractionResponse.data,
                schema,
                {
                    confidence: extractionResponse.metadata.confidence,
                    processingTime: Date.now() - startTime,
                    metadata: {
                        ...extractionResponse.metadata,
                        documentType: document.getFileTypeCategory(),
                        isUrl: document.isUrlDocument()
                    }
                }
            );

            // Mark document as completed
            document.markAsCompleted();

            // Store result
            this.results.set(document.id, result);

            return {
                success: true,
                documentId: document.id,
                result: result,
                summary: result.getSummary()
            };

        } catch (error) {
            // Mark document as failed
            if (document) {
                document.markAsFailed();
            }

            // Store error
            this.errors.set(document?.id || 'unknown', {
                error: error.message,
                timestamp: new Date(),
                document: document?.getSummary()
            });

            throw error;
        }
    }

    /**
     * Extract data from multiple documents (bulk processing)
     */
    async extractBulk(filePaths, schemaDefinition, options = {}) {
        const startTime = Date.now();
        const results = {
            total: filePaths.length,
            completed: 0,
            failed: 0,
            results: [],
            errors: []
        };

        try {
            // Create schema once for all documents
            const schema = this.createSchema(schemaDefinition);

            // Create documents and add to batch
            for (const filePath of filePaths) {
                try {
                    const document = this.createDocument(filePath, options);
                    this.batchService.addToBatch(document);
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        filePath,
                        error: error.message
                    });
                }
            }

            // Process batch
            const batchResults = await this.batchService.processBatch(async (document) => {
                return await this.extractData(document.filePath.value, schemaDefinition, options);
            });

            // Process results
            results.completed = batchResults.completed;
            results.failed += batchResults.failed;
            results.results = this.batchService.completedDocuments.map(doc =>
                this.results.get(doc.id)
            ).filter(Boolean);

            results.processingTime = Date.now() - startTime;
            results.batchStats = this.batchService.getBatchStats();

            return results;

        } catch (error) {
            throw new Error(`Bulk extraction failed: ${error.message}`);
        }
    }

    /**
     * Create document entity
     */
    createDocument(filePath, options = {}) {
        const documentId = options.documentId || this.generateDocumentId();
        const mimeType = options.mimeType;
        const size = options.size;

        return new Document(documentId, filePath, mimeType, size, {
            batchSize: options.batchSize,
            maxWorkers: options.maxWorkers,
            maxRetries: options.maxRetries,
            maxRetryWaitTime: options.maxRetryWaitTime,
            retryLoggingStyle: options.retryLoggingStyle
        });
    }

    /**
     * Create schema entity
     */
    createSchema(schemaDefinition) {
        if (schemaDefinition instanceof Schema) {
            return schemaDefinition;
        }

        // Handle simple schema format
        if (typeof schemaDefinition === 'object' && !schemaDefinition.fields) {
            const fields = {};
            const required = [];

            for (const [fieldName, fieldType] of Object.entries(schemaDefinition)) {
                fields[fieldName] = { type: fieldType };
                required.push(fieldName);
            }

            return new Schema(fields, { required });
        }

        // Handle full schema format
        return new Schema(schemaDefinition.fields, {
            required: schemaDefinition.required || [],
            validationRules: schemaDefinition.validationRules,
            additionalProperties: schemaDefinition.additionalProperties,
            version: schemaDefinition.version
        });
    }

    /**
     * Generate unique document ID
     */
    generateDocumentId() {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get extraction result by document ID
     */
    getResult(documentId) {
        return this.results.get(documentId);
    }

    /**
     * Get error by document ID
     */
    getError(documentId) {
        return this.errors.get(documentId);
    }

    /**
     * Get all results
     */
    getAllResults() {
        return Array.from(this.results.values());
    }

    /**
     * Get all errors
     */
    getAllErrors() {
        return Array.from(this.errors.entries()).map(([id, error]) => ({
            documentId: id,
            ...error
        }));
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        const results = this.getAllResults();
        const errors = this.getAllErrors();

        return {
            totalProcessed: results.length + errors.length,
            successful: results.length,
            failed: errors.length,
            successRate: results.length / (results.length + errors.length) * 100,
            averageConfidence: results.length > 0
                ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
                : 0,
            averageProcessingTime: results.length > 0
                ? results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
                : 0,
            batchStats: this.batchService.getBatchStats()
        };
    }

    /**
     * Clear all results and errors
     */
    clearResults() {
        this.results.clear();
        this.errors.clear();
        this.batchService.clearResults();
    }

    /**
     * Test API connection
     */
    async testConnection() {
        return await this.repository.testConnection();
    }

    /**
     * Get service configuration
     */
    getConfiguration() {
        return {
            ...this.config,
            repository: this.repository.getConfiguration(),
            batchService: this.batchService.getBatchStats().configuration
        };
    }

    /**
     * Validate schema before processing
     */
    validateSchema(schemaDefinition) {
        try {
            const schema = this.createSchema(schemaDefinition);
            return {
                isValid: true,
                schema: schema,
                summary: schema.getSummary()
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Get supported file types
     */
    getSupportedFileTypes() {
        return {
            pdf: ['application/pdf'],
            images: [
                'image/jpeg', 'image/png', 'image/tiff', 'image/bmp',
                'image/gif', 'image/webp', 'image/jp2', 'image/jpm',
                'image/mj2', 'image/x-tga', 'image/x-exr',
                'image/vnd.radiance', 'image/x-pict'
            ],
            extensions: [
                '.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif',
                '.bmp', '.gif', '.webp', '.jp2', '.j2k', '.jpx',
                '.jpf', '.jpm', '.mj2', '.tga', '.exr', '.hdr', '.pic'
            ]
        };
    }

    /**
     * Create a simple schema from field names
     */
    createSimpleSchema(fieldNames, options = {}) {
        const fields = {};
        const required = options.required || fieldNames;

        for (const fieldName of fieldNames) {
            fields[fieldName] = {
                type: options.defaultType || 'string',
                validation: options.validationRules?.[fieldName]
            };
        }

        return new Schema(fields, {
            required,
            additionalProperties: options.additionalProperties,
            version: options.version || '1.0.0'
        });
    }
}

module.exports = { DocumentAIService };
