const { z } = require('zod');

class Schema {
    constructor(fields, options = {}) {
        this.fields = fields;
        this.validationRules = options.validationRules || {};
        this.required = options.required || [];
        this.additionalProperties = options.additionalProperties !== false; // Default to true
        this.createdAt = new Date();
        this.version = options.version || '1.0.0';

        // Validate schema on construction
        this.validate();
    }

    /**
     * Validate schema structure and rules
     */
    validate() {
        const errors = [];

        if (!this.fields || typeof this.fields !== 'object') {
            errors.push('Schema fields must be a valid object');
        }

        if (!Array.isArray(this.required)) {
            errors.push('Required fields must be an array');
        }

        // Validate that required fields exist in fields object
        for (const requiredField of this.required) {
            if (!this.fields[requiredField]) {
                errors.push(`Required field '${requiredField}' is not defined in schema`);
            }
        }

        // Validate field definitions
        for (const [fieldName, fieldDef] of Object.entries(this.fields)) {
            const fieldErrors = this.validateField(fieldName, fieldDef);
            errors.push(...fieldErrors);
        }

        if (errors.length > 0) {
            throw new Error(`Schema validation failed: ${errors.join(', ')}`);
        }

        return { isValid: true, errors: [] };
    }

    /**
     * Validate individual field definition
     */
    validateField(fieldName, fieldDef) {
        const errors = [];

        if (!fieldDef || typeof fieldDef !== 'object') {
            errors.push(`Field '${fieldName}' must be a valid object`);
            return errors;
        }

        // Check required field properties
        if (!fieldDef.type) {
            errors.push(`Field '${fieldName}' must have a type`);
        }

        // Validate field type
        const validTypes = ['string', 'number', 'boolean', 'date', 'array', 'object'];
        if (fieldDef.type && !validTypes.includes(fieldDef.type)) {
            errors.push(`Field '${fieldName}' has invalid type: ${fieldDef.type}`);
        }

        // Validate array field items
        if (fieldDef.type === 'array' && !fieldDef.items) {
            errors.push(`Array field '${fieldName}' must specify items type`);
        }

        // Validate validation rules
        if (fieldDef.validation) {
            const validationErrors = this.validateFieldRules(fieldName, fieldDef);
            errors.push(...validationErrors);
        }

        return errors;
    }

    /**
     * Validate field validation rules
     */
    validateFieldRules(fieldName, fieldDef) {
        const errors = [];
        const rules = fieldDef.validation;

        // String validation rules
        if (fieldDef.type === 'string') {
            if (rules.minLength && typeof rules.minLength !== 'number') {
                errors.push(`Field '${fieldName}' minLength must be a number`);
            }
            if (rules.maxLength && typeof rules.maxLength !== 'number') {
                errors.push(`Field '${fieldName}' maxLength must be a number`);
            }
            if (rules.pattern && typeof rules.pattern !== 'string') {
                errors.push(`Field '${fieldName}' pattern must be a string`);
            }
            if (rules.enum && !Array.isArray(rules.enum)) {
                errors.push(`Field '${fieldName}' enum must be an array`);
            }
        }

        // Number validation rules
        if (fieldDef.type === 'number') {
            if (rules.min && typeof rules.min !== 'number') {
                errors.push(`Field '${fieldName}' min must be a number`);
            }
            if (rules.max && typeof rules.max !== 'number') {
                errors.push(`Field '${fieldName}' max must be a number`);
            }
        }

        // Array validation rules
        if (fieldDef.type === 'array') {
            if (rules.minItems && typeof rules.minItems !== 'number') {
                errors.push(`Field '${fieldName}' minItems must be a number`);
            }
            if (rules.maxItems && typeof rules.maxItems !== 'number') {
                errors.push(`Field '${fieldName}' maxItems must be a number`);
            }
        }

        return errors;
    }

    /**
     * Create Zod schema for validation
     */
    toZodSchema() {
        const schemaObject = {};

        for (const [fieldName, fieldDef] of Object.entries(this.fields)) {
            let zodField = this.createZodField(fieldDef);

            // Apply validation rules
            if (fieldDef.validation) {
                zodField = this.applyValidationRules(zodField, fieldDef.validation);
            }

            schemaObject[fieldName] = zodField;
        }

        let schema = z.object(schemaObject);

        // Set required fields
        if (this.required.length > 0) {
            schema = schema.required(this.required);
        }

        // Handle additional properties
        if (!this.additionalProperties) {
            schema = schema.strict();
        }

        return schema;
    }

    /**
     * Create Zod field based on type
     */
    createZodField(fieldDef) {
        switch (fieldDef.type) {
            case 'string':
                return z.string();
            case 'number':
                return z.number();
            case 'boolean':
                return z.boolean();
            case 'date':
                return z.date();
            case 'array':
                return z.array(this.createZodField(fieldDef.items));
            case 'object':
                return z.object(fieldDef.properties || {});
            default:
                return z.any();
        }
    }

    /**
     * Apply validation rules to Zod field
     */
    applyValidationRules(zodField, rules) {
        let field = zodField;

        // String validations
        if (rules.minLength !== undefined) {
            field = field.min(rules.minLength);
        }
        if (rules.maxLength !== undefined) {
            field = field.max(rules.maxLength);
        }
        if (rules.pattern) {
            field = field.regex(new RegExp(rules.pattern));
        }
        if (rules.enum) {
            field = field.enum(rules.enum);
        }

        // Number validations
        if (rules.min !== undefined) {
            field = field.min(rules.min);
        }
        if (rules.max !== undefined) {
            field = field.max(rules.max);
        }

        // Array validations
        if (rules.minItems !== undefined) {
            field = field.min(rules.minItems);
        }
        if (rules.maxItems !== undefined) {
            field = field.max(rules.maxItems);
        }

        return field;
    }

    /**
     * Validate extracted data against schema
     */
    validateData(data) {
        try {
            const zodSchema = this.toZodSchema();
            const validatedData = zodSchema.parse(data);

            return {
                isValid: true,
                data: validatedData,
                errors: []
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    isValid: false,
                    data: null,
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code
                    }))
                };
            }
            throw error;
        }
    }

    /**
     * Get JSON Schema representation
     */
    toJsonSchema() {
        const jsonSchema = {
            type: 'object',
            properties: {},
            required: this.required,
            additionalProperties: this.additionalProperties
        };

        for (const [fieldName, fieldDef] of Object.entries(this.fields)) {
            jsonSchema.properties[fieldName] = this.fieldToJsonSchema(fieldDef);
        }

        return jsonSchema;
    }

    /**
     * Convert field definition to JSON Schema
     */
    fieldToJsonSchema(fieldDef) {
        const jsonField = {
            type: fieldDef.type
        };

        // Add validation properties
        if (fieldDef.validation) {
            Object.assign(jsonField, fieldDef.validation);
        }

        // Handle array items
        if (fieldDef.type === 'array' && fieldDef.items) {
            jsonField.items = this.fieldToJsonSchema(fieldDef.items);
        }

        // Handle object properties
        if (fieldDef.type === 'object' && fieldDef.properties) {
            jsonField.properties = {};
            for (const [propName, propDef] of Object.entries(fieldDef.properties)) {
                jsonField.properties[propName] = this.fieldToJsonSchema(propDef);
            }
        }

        return jsonField;
    }

    /**
     * Get required fields
     */
    getRequiredFields() {
        return [...this.required];
    }

    /**
     * Check if field is required
     */
    isFieldRequired(fieldName) {
        return this.required.includes(fieldName);
    }

    /**
     * Get field definition
     */
    getField(fieldName) {
        return this.fields[fieldName];
    }

    /**
     * Get all field names
     */
    getFieldNames() {
        return Object.keys(this.fields);
    }

    /**
     * Get schema summary
     */
    getSummary() {
        return {
            version: this.version,
            fieldCount: Object.keys(this.fields).length,
            requiredCount: this.required.length,
            createdAt: this.createdAt,
            additionalProperties: this.additionalProperties
        };
    }

    /**
     * Create a new Schema instance with updated fields
     */
    withFields(newFields, options = {}) {
        return new Schema(newFields, {
            required: options.required || this.required,
            validationRules: options.validationRules || this.validationRules,
            additionalProperties: options.additionalProperties !== undefined
                ? options.additionalProperties
                : this.additionalProperties,
            version: options.version || this.version
        });
    }

    /**
     * Merge with another schema
     */
    merge(otherSchema) {
        const mergedFields = { ...this.fields, ...otherSchema.fields };
        const mergedRequired = [...new Set([...this.required, ...otherSchema.required])];

        return new Schema(mergedFields, {
            required: mergedRequired,
            additionalProperties: this.additionalProperties && otherSchema.additionalProperties,
            version: `${this.version}+${otherSchema.version}`
        });
    }
}

module.exports = { Schema };
