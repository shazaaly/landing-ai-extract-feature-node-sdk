const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class DocumentAI {
    constructor(apiKey) {
        if (!apiKey) throw new Error('API key is required.');
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.va.landing.ai/v1/tools/agentic-document-analysis';
    }

    async extract(filePath, simpleSchema) {
        const fullSchema = this._buildJsonSchema(simpleSchema);

        // Step 2: Prepare the file for upload.
        const form = new FormData();
        form.append('pdf', fs.createReadStream(filePath));
        form.append('fields_schema', JSON.stringify(fullSchema));

        // Step 3: Make the API call and hide all the complexity.
        try {
            const response = await axios.post(this.apiUrl, form, {
                headers: {
                    'Authorization': `Basic ${this.apiKey}`,
                    ...form.getHeaders()
                }
            });
            return response.data.data.extracted_schema;
        } catch (error) {
            // Provide a much clearer error if something goes wrong.
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    // This is our "private" helper that does the boring work.
    _buildJsonSchema(simpleSchema) {
        const properties = {};
        const required = [];

        for (const key in simpleSchema) {
            properties[key] = { type: 'string' }; // For now, we only support strings
            required.push(key);
        }

        return {
            type: 'object',
            required: required,
            properties: properties,
            additionalProperties: false
        };
    }
}

// Export the class so it can be used in other files.
module.exports = DocumentAI;