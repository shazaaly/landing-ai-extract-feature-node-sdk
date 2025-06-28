// Main SDK entry point
const { DocumentAIService } = require('./domain/application/document_ai.service');
const { Schema } = require('./domain/entities/schema');
const { Document } = require('./domain/entities/documents');
const { ExtractionResult } = require('./domain/entities/extraction');
const { FilePath } = require('./domain/value-objects/file_path');

// Main DocumentAI class for backward compatibility
class DocumentAI {
    constructor(apiKey, options = {}) {
        this.service = new DocumentAIService({
            apiKey,
            ...options
        });
    }

    /**
     * Extract data from a single document
     */
    async extract(filePath, schema) {
        return await this.service.extractData(filePath, schema);
    }

    /**
     * Extract data from multiple documents
     */
    async extractBulk(filePaths, schema) {
        return await this.service.extractBulk(filePaths, schema);
    }

    /**
     * Test API connection
     */
    async testConnection() {
        return await this.service.testConnection();
    }

    /**
     * Get service configuration
     */
    getConfiguration() {
        return this.service.getConfiguration();
    }

    /**
     * Validate schema
     */
    validateSchema(schema) {
        return this.service.validateSchema(schema);
    }

    /**
     * Get supported file types
     */
    getSupportedFileTypes() {
        return this.service.getSupportedFileTypes();
    }
}

// Export main class and all components
module.exports = {
    DocumentAI,
    DocumentAIService,
    Schema,
    Document,
    ExtractionResult,
    FilePath
};