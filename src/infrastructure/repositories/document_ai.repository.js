const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class DocumentAIRepository {
    constructor(config) {
        this.config = {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || 'https://api.va.landing.ai/v1/tools/agentic-document-analysis',
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
                case 403:
                    return new Error('Access denied. Please check your API permissions.');
                case 404:
                    return new Error('API endpoint not found. Please check the base URL.');
                case 413:
                    return new Error('File too large. Please use a smaller file.');
                case 429:
                    return new Error('Rate limit exceeded. Please try again later.');
                case 500:
                    return new Error('Internal server error. Please try again later.');
                case 502:
                case 503:
                case 504:
                    return new Error('Service temporarily unavailable. Please try again later.');
                default:
                    return new Error(`API error (${status}): ${data?.message || data?.error || 'Unknown error'}`);
            }
        }

        if (error.code === 'ENOTFOUND') {
            return new Error('Network error: Could not connect to API server.');
        }

        if (error.code === 'ECONNABORTED') {
            return new Error('Request timeout. Please try again.');
        }

        if (error.code === 'ENOENT') {
            return new Error(`File not found: ${document.filePath.value}`);
        }

        // Return original error if no specific handling
        return error;
    }

    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            const response = await this.httpClient.get('', {
                timeout: 10000 // Shorter timeout for connection test
            });

            return {
                success: true,
                message: 'Connection successful',
                status: response.status,
                data: response.data
            };

        } catch (error) {
            if (error.response?.status === 401) {
                return {
                    success: false,
                    message: 'Invalid API key',
                    status: error.response.status
                };
            }

            if (error.code === 'ENOTFOUND') {
                return {
                    success: false,
                    message: 'Could not connect to API server',
                    status: 'NETWORK_ERROR'
                };
            }

            return {
                success: false,
                message: error.message,
                status: error.response?.status || 'UNKNOWN_ERROR'
            };
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
            retryDelay: this.config.retryDelay,
            hasApiKey: !!this.config.apiKey
        };
    }
}

module.exports = { DocumentAIRepository };