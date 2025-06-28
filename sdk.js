const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class DocumentAI {
    constructor(apiKey) {
        if (!apiKey || apiKey === 'YOUR_API_KEY') {
            throw new Error('Please provide a valid API key. Replace "YOUR_API_KEY" with your actual API key.');
        }
        this.apiKey = apiKey;
        this.baseUrl = "https://api.va.landing.ai/v1/tools/agentic-document-analysis";
    }

    async extract(filePath, schema) {
        if (!filePath) {
            throw new Error('File path is required');
        }

        if (!schema || typeof schema !== 'object') {
            throw new Error('Schema must be a valid object');
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const headers = {
            "Authorization": `Basic ${this.apiKey}`
        };

        const form = new FormData();
        form.append('pdf', fs.createReadStream(filePath));
        form.append('fields_schema', JSON.stringify(schema));

        try {
            const response = await axios.post(this.baseUrl, form, { headers });
            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Invalid API key. Please check your API key and try again.');
            } else if (error.response?.status === 400) {
                throw new Error('Invalid request. Please check your schema and file format.');
            } else if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            } else {
                throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
            }
        }
    }
}

module.exports = DocumentAI;