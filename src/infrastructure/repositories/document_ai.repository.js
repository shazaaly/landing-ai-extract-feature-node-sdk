const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class DocumentAIRepository {
    constructor(config) {
        this.config = {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || 'https://api.va.staging.landing.ai/v1/tools/agentic-document-analysis',
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };

        this.httpClient = this.createHttpClient();
    }

    /**
     * Create configured HTTP client
     */
    createHttpClient() {
        return axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Basic ${this.config.apiKey}`,
                'User-Agent': 'DocumentAI-NodeJS-SDK/1.0.0'
            }
        });
    }

    /**
     * Extract data from document
     */
    async extract(document, schema) {
        try {
            // Prepare form data
            const formData = await this.prepareFormData(document, schema);

            // Make API request with retry logic
            const response = await this.makeRequestWithRetry(formData);

            return this.processResponse(response);

        } catch (error) {
            throw this.handleError(error, document);
        }
    }

    /**
     * Prepare form data for API request
     */
    async prepareFormData(document, schema) {
        const form = new FormData();

        // Add file or URL
        if (document.isUrlDocument()) {
            // For URLs, we need to download the file first
            const fileBuffer = await this.downloadFileFromUrl(document.filePath.value);
            form.append('pdf', fileBuffer, {
                filename: document.filePath.getFileName() + document.filePath.getExtension(),
                contentType: document.mimeType
            });
        } else {
            // For local files
            form.append('pdf', fs.createReadStream(document.filePath.value));
        }

        // Add schema
        form.append('fields_schema', JSON.stringify(schema.toJsonSchema()));

        return form;
    }

    /**
     * Download file from URL
     */
    async downloadFileFromUrl(url) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: this.config.timeout,
                maxContentLength: 50 * 1024 * 1024 // 50MB limit
            });

            return Buffer.from(response.data);
        } catch (error) {
            throw new Error(`Failed to download file from URL: ${error.message}`);
        }
    }

    /**
     * Make API request with retry logic
     */
    async makeRequestWithRetry(formData) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await this.httpClient.post('', formData, {
                    headers: {
                        ...formData.getHeaders()
                    }
                });

                return response;

            } catch (error) {
                lastError = error;

                // Don't retry on certain errors
                if (this.shouldNotRetry(error)) {
                    throw error;
                }

                // Wait before retry (exponential backoff)
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Determine if error should not be retried
     */
    shouldNotRetry(error) {
        // Don't retry on authentication errors
        if (error.response?.status === 401) {
            return true;
        }

        // Don't retry on validation errors
        if (error.response?.status === 400) {
            return true;
        }

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
            return true;
        }

        return false;
    }

    /**
     * Process API response
     */
    processResponse(response) {
        if (!response.data) {
            throw new Error('Empty response from API');
        }

        // Handle different response formats
        if (response.data.data && response.data.data.extracted_schema) {
            return {
                success: true,
                data: response.data.data.extracted_schema,
                metadata: {
                    requestId: response.data.request_id,
                    processingTime: response.data.processing_time,
                    confidence: response.data.confidence
                }
            };
        }

        if (response.data.extracted_schema) {
            return {
                success: true,
                data: response.data.extracted_schema,
                metadata: {
                    processingTime: response.data.processing_time,
                    confidence: response.data.confidence
                }
            };
        }

        // Fallback to raw response data
        return {
            success: true,
            data: response.data,
            metadata: {}
        };
    }

    /**
     * Handle and transform errors
     */
    handleError(error, document) {
        if (error.response) {
            // API error response
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 401:
                    return new Error('Invalid API key. Please check your credentials.');
                case 400:
                    return new Error(`Invalid request: ${data.message || 'Check your schema and file format.'}`);
                case 413:
                    return new Error('File too large. Maximum file size is 50MB.');
                case 429:
                    return new Error('Rate limit exceeded. Please try again later.');
                case 500:
                    return new Error('Internal server error. Please try again later.');
                default:
                    return new Error(`API Error (${status}): ${data.message || 'Unknown error occurred.'}`);
            }
        }

        if (error.code === 'ENOENT') {
            return new Error(`File not found: ${document.filePath.value}`);
        }

        if (error.code === 'ECONNABORTED') {
            return new Error('Request timeout. Please try again.');
        }

        if (error.code === 'ENOTFOUND') {
            return new Error('Network error. Please check your internet connection.');
        }

        return new Error(`Extraction failed: ${error.message}`);
    }

    /**
     * Utility method for sleep/delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            // Try to make a simple request to test connectivity
            // Since there might not be a status endpoint, we'll test with a minimal request
            const response = await this.httpClient.get('', {
                timeout: 5000,
                validateStatus: function (status) {
                    // Accept any status code as it means we can reach the API
                    return status >= 200 && status < 600;
                }
            });

            return {
                success: true,
                message: 'Connection successful',
                status: response.status
            };
        } catch (error) {
            // If it's a 401, it means the API is reachable but auth failed
            if (error.response?.status === 401) {
                return {
                    success: true,
                    message: 'API reachable but authentication failed - check your API key',
                    status: 401
                };
            }

            // If it's a 404, it might mean the endpoint doesn't exist but API is reachable
            if (error.response?.status === 404) {
                return {
                    success: true,
                    message: 'API reachable but endpoint not found - this is normal',
                    status: 404
                };
            }

            return {
                success: false,
                message: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Get API status
     */
    async getStatus() {
        try {
            const response = await this.httpClient.get('/status');
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get API status: ${error.message}`);
        }
    }

    /**
     * Get repository configuration
     */
    getConfiguration() {
        return {
            baseUrl: this.config.baseUrl,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries,
            retryDelay: this.config.retryDelay
        };
    }
}

module.exports = { DocumentAIRepository };