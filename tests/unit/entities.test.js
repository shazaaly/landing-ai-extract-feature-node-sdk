const { Document } = require('../../src/domain/entities/documents');
const { Schema } = require('../../src/domain/entities/schema');
const { ExtractionResult } = require('../../src/domain/entities/extraction');
const { FilePath } = require('../../src/domain/value-objects/file_path');

describe('Domain Entities', () => {
    describe('Document Entity', () => {
        test('should create a valid document', () => {
            const document = new Document('doc-001', './test.pdf', 'application/pdf', 1024000);

            expect(document.id).toBe('doc-001');
            expect(document.mimeType).toBe('application/pdf');
            expect(document.size).toBe(1024000);
            expect(document.processingStatus).toBe('pending');
        });

        test('should validate document can be processed', () => {
            const document = new Document('doc-001', './test.pdf', 'application/pdf', 1024000);
            const canProcess = document.canBeProcessed();

            expect(canProcess).toHaveProperty('canProcess');
            expect(canProcess).toHaveProperty('reason');
            expect(canProcess).toHaveProperty('code');
        });

        test('should handle URL documents', () => {
            const document = new Document('doc-002', 'https://example.com/document.pdf', 'application/pdf');

            expect(document.isUrlDocument()).toBe(true);
            expect(document.isLocalDocument()).toBe(false);
            expect(document.getFileTypeCategory()).toBe('pdf');
        });

        test('should handle image documents', () => {
            const document = new Document('doc-003', './image.jpg', 'image/jpeg', 512000);

            expect(document.getFileTypeCategory()).toBe('image');
            expect(document.isUrlDocument()).toBe(false);
            expect(document.isLocalDocument()).toBe(true);
        });

        test('should track processing state', () => {
            const document = new Document('doc-004', './test.pdf', 'application/pdf', 1024000);

            expect(document.processingStatus).toBe('pending');

            document.markAsProcessing();
            expect(document.processingStatus).toBe('processing');
            expect(document.processingAttempts).toBe(1);

            document.markAsCompleted();
            expect(document.processingStatus).toBe('completed');
        });
    });

    describe('Schema Entity', () => {
        test('should create a valid schema', () => {
            const schema = new Schema({
                name: { type: 'string' },
                age: { type: 'number' }
            }, {
                required: ['name']
            });

            expect(schema.getFieldNames()).toContain('name');
            expect(schema.getFieldNames()).toContain('age');
            expect(schema.isFieldRequired('name')).toBe(true);
            expect(schema.isFieldRequired('age')).toBe(false);
        });

        test('should validate data against schema', () => {
            const schema = new Schema({
                name: { type: 'string' },
                age: { type: 'number' }
            }, {
                required: ['name']
            });

            const validData = { name: 'John', age: 30 };
            const validation = schema.validateData(validData);

            expect(validation.isValid).toBe(true);
            expect(validation.data).toEqual(validData);
        });

        test('should reject invalid data', () => {
            const schema = new Schema({
                name: { type: 'string' },
                age: { type: 'number' }
            }, {
                required: ['name']
            });

            const invalidData = { age: 'not a number' };
            const validation = schema.validateData(invalidData);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });

        test('should convert to JSON Schema', () => {
            const schema = new Schema({
                name: { type: 'string' },
                age: { type: 'number' }
            }, {
                required: ['name']
            });

            const jsonSchema = schema.toJsonSchema();

            expect(jsonSchema.type).toBe('object');
            expect(jsonSchema.properties).toHaveProperty('name');
            expect(jsonSchema.properties).toHaveProperty('age');
            expect(jsonSchema.required).toContain('name');
        });
    });

    describe('ExtractionResult Entity', () => {
        let schema;
        let validData;

        beforeEach(() => {
            schema = new Schema({
                name: { type: 'string' },
                email: { type: 'string' },
                age: { type: 'number' }
            }, {
                required: ['name', 'email']
            });

            validData = {
                name: 'Jane Doe',
                email: 'jane@example.com',
                age: 25
            };
        });

        test('should create a valid extraction result', () => {
            const result = new ExtractionResult('doc-001', validData, schema, {
                confidence: 0.95,
                processingTime: 2500
            });

            expect(result.documentId).toBe('doc-001');
            expect(result.confidence).toBe(0.95);
            expect(result.processingTime).toBe(2500);
            expect(result.isValid()).toBe(true);
        });

        test('should calculate confidence correctly', () => {
            const result = new ExtractionResult('doc-001', validData, schema);

            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(result.getConfidenceLevel()).toBe('high');
        });

        test('should identify missing required fields', () => {
            const incompleteData = { name: 'Jane Doe' }; // Missing email
            const result = new ExtractionResult('doc-001', incompleteData, schema);

            const missingFields = result.getMissingRequiredFields();
            expect(missingFields).toContain('email');
        });

        test('should calculate completion percentage', () => {
            const result = new ExtractionResult('doc-001', validData, schema);

            expect(result.getCompletionPercentage()).toBe(100);
            expect(result.getFilledFieldsCount()).toBe(3);
        });

        test('should validate business rules', () => {
            const result = new ExtractionResult('doc-001', validData, schema, {
                confidence: 0.95
            });

            const businessValidation = result.validateBusinessRules();
            expect(businessValidation.isValid).toBe(true);
            expect(businessValidation.violations.length).toBe(0);
        });

        test('should handle field operations', () => {
            const result = new ExtractionResult('doc-001', validData, schema);

            const nameField = result.getField('name');
            expect(nameField.value).toBe('Jane Doe');
            expect(nameField.isRequired).toBe(true);
            expect(nameField.confidence).toBeGreaterThan(0);
        });
    });

    describe('FilePath Value Object', () => {
        test('should create valid file path', () => {
            const filePath = new FilePath('./test.pdf');

            expect(filePath.value).toBe('./test.pdf');
            expect(filePath.getExtension()).toBe('.pdf');
            expect(filePath.getMimeType()).toBe('application/pdf');
        });

        test('should handle URL paths', () => {
            const urlPath = new FilePath('https://example.com/document.pdf');

            expect(urlPath.isUrlPath()).toBe(true);
            expect(urlPath.isLocalPath()).toBe(false);
            expect(urlPath.getExtension()).toBe('.pdf');
            expect(urlPath.getMimeType()).toBe('application/pdf');
        });

        test('should validate supported file types', () => {
            const pdfPath = new FilePath('./document.pdf');
            const jpgPath = new FilePath('./image.jpg');
            const txtPath = new FilePath('./document.txt');

            expect(pdfPath.isSupportedType()).toBe(true);
            expect(jpgPath.isSupportedType()).toBe(true);
            expect(txtPath.isSupportedType()).toBe(false);
        });

        test('should handle file validation', () => {
            const filePath = new FilePath('./test.pdf');
            const validation = filePath.validateForProcessing();

            expect(validation).toHaveProperty('isValid');
            expect(validation).toHaveProperty('errors');
            expect(validation).toHaveProperty('fileInfo');
        });
    });
});