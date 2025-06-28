const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class FilePath {
    constructor(filePath) {
        this.validate(filePath);
        this.value = filePath;
        this.isUrl = this.isValidUrl(filePath);

        if (this.isUrl) {
            this.normalizedPath = filePath; // Keep URL as is
        } else {
            this.normalizedPath = path.resolve(filePath);
        }
    }

    /**
     * Validate file path according to business rules
     */
    validate(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('File path must be a non-empty string');
        }

        if (filePath.trim().length === 0) {
            throw new Error('File path cannot be empty or whitespace');
        }

        // Check if it's a URL
        if (this.isValidUrl(filePath)) {
            this.validateUrl(filePath);
            return;
        }

        // Check for path traversal attempts (only for local files)
        if (filePath.includes('..') || filePath.includes('~')) {
            throw new Error('File path contains invalid characters');
        }

        // Check for absolute path restrictions (optional security measure)
        if (path.isAbsolute(filePath) && !this.isAllowedAbsolutePath(filePath)) {
            throw new Error('Absolute file path not allowed for security reasons');
        }
    }

    /**
     * Check if string is a valid URL
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate URL format and supported protocols
     */
    validateUrl(urlString) {
        try {
            const url = new URL(urlString);

            // Check supported protocols
            const supportedProtocols = ['http:', 'https:'];
            if (!supportedProtocols.includes(url.protocol)) {
                throw new Error(`Unsupported protocol: ${url.protocol}. Only HTTP and HTTPS are supported.`);
            }

            // Check if URL points to a file (has file extension)
            const pathname = url.pathname;
            if (!pathname.includes('.')) {
                throw new Error('URL must point to a file with a valid extension');
            }

            // Check if file extension is supported
            const extension = path.extname(pathname).toLowerCase();
            const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.gif', '.webp'];

            if (!supportedExtensions.includes(extension)) {
                throw new Error(`Unsupported file extension in URL: ${extension}`);
            }

        } catch (error) {
            if (error.message.includes('Unsupported protocol') || error.message.includes('Unsupported file extension')) {
                throw error;
            }
            throw new Error('Invalid URL format');
        }
    }

    /**
     * Check if the file exists and is accessible (for local files only)
     */
    exists() {
        if (this.isUrl) {
            // For URLs, we can't check existence without making a request
            // This would be handled during actual processing
            return true;
        }

        try {
            return fs.existsSync(this.normalizedPath);
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if the file is readable (for local files only)
     */
    isReadable() {
        if (this.isUrl) {
            // URLs are considered readable
            return true;
        }

        try {
            fs.accessSync(this.normalizedPath, fs.constants.R_OK);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get file extension
     */
    getExtension() {
        if (this.isUrl) {
            const url = new URL(this.value);
            return path.extname(url.pathname).toLowerCase();
        }
        return path.extname(this.value).toLowerCase();
    }

    /**
     * Get file name without extension
     */
    getFileName() {
        if (this.isUrl) {
            const url = new URL(this.value);
            return path.basename(url.pathname, this.getExtension());
        }
        return path.basename(this.value, this.getExtension());
    }

    /**
     * Get directory path (for local files only)
     */
    getDirectory() {
        if (this.isUrl) {
            throw new Error('Cannot get directory for URL');
        }
        return path.dirname(this.normalizedPath);
    }

    /**
     * Get file size in bytes (for local files only)
     */
    getSize() {
        if (this.isUrl) {
            throw new Error('Cannot get file size for URL without downloading');
        }

        try {
            const stats = fs.statSync(this.normalizedPath);
            return stats.size;
        } catch (error) {
            throw new Error(`Cannot get file size: ${error.message}`);
        }
    }

    /**
     * Get file MIME type based on extension
     */
    getMimeType() {
        const extension = this.getExtension();
        const mimeTypes = {
            // PDF files
            '.pdf': 'application/pdf',

            // Image files supported by OpenCV
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
            '.bmp': 'image/bmp',
            '.gif': 'image/gif',
            '.webp': 'image/webp',

            // Additional OpenCV supported formats
            '.ppm': 'image/x-portable-pixmap',
            '.pgm': 'image/x-portable-graymap',
            '.pbm': 'image/x-portable-bitmap',
            '.sr': 'image/x-sun-raster',
            '.ras': 'image/x-cmu-raster',
            '.jp2': 'image/jp2',
            '.j2k': 'image/jp2',
            '.jpx': 'image/jp2',
            '.jpf': 'image/jp2',
            '.jpm': 'image/jpm',
            '.mj2': 'image/mj2',
            '.tga': 'image/x-tga',
            '.exr': 'image/x-exr',
            '.hdr': 'image/vnd.radiance',
            '.pic': 'image/x-pict'
        };
        return mimeTypes[extension] || 'application/octet-stream';
    }

    /**
     * Check if file type is supported for processing
     */
    isSupportedType() {
        const supportedExtensions = [
            // PDF files
            '.pdf',

            // Common image formats supported by OpenCV
            '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.gif', '.webp',

            // Additional OpenCV supported formats
            '.ppm', '.pgm', '.pbm', '.sr', '.ras', '.jp2', '.j2k', '.jpx',
            '.jpf', '.jpm', '.mj2', '.tga', '.exr', '.hdr', '.pic'
        ];
        return supportedExtensions.includes(this.getExtension());
    }

    /**
     * Get file creation and modification times (for local files only)
     */
    getFileStats() {
        if (this.isUrl) {
            throw new Error('Cannot get file stats for URL');
        }

        try {
            const stats = fs.statSync(this.normalizedPath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime
            };
        } catch (error) {
            throw new Error(`Cannot get file stats: ${error.message}`);
        }
    }

    /**
     * Check if absolute path is allowed (security measure for local files only)
     */
    isAllowedAbsolutePath(filePath) {
        // Define allowed directories for security
        const allowedDirectories = [
            process.cwd(),
            path.join(process.cwd(), 'uploads'),
            path.join(process.cwd(), 'documents'),
            path.join(process.cwd(), 'temp')
        ];

        const normalizedPath = path.resolve(filePath);
        return allowedDirectories.some(allowedDir =>
            normalizedPath.startsWith(allowedDir)
        );
    }

    /**
     * Create a safe file path for processing
     */
    toSafePath() {
        if (this.isUrl) {
            // For URLs, just return the URL as is
            return this.value;
        }

        // Remove any potentially dangerous characters for local files
        return this.value.replace(/[<>:"|?*]/g, '_');
    }

    /**
     * Check if file path is within allowed size limits (for local files only)
     */
    isWithinSizeLimit(maxSize = 50 * 1024 * 1024) { // 50MB default
        if (this.isUrl) {
            // For URLs, we can't check size without downloading
            // This will be checked during actual processing
            return true;
        }

        try {
            const size = this.getSize();
            return size <= maxSize;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get relative path from current working directory (for local files only)
     */
    getRelativePath() {
        if (this.isUrl) {
            throw new Error('Cannot get relative path for URL');
        }
        return path.relative(process.cwd(), this.normalizedPath);
    }

    /**
     * Validate file path for processing
     */
    validateForProcessing() {
        const errors = [];

        if (this.isUrl) {
            // URL-specific validation
            try {
                this.validateUrl(this.value);
            } catch (error) {
                errors.push(error.message);
            }
        } else {
            // Local file validation
            if (!this.exists()) {
                errors.push('File does not exist');
            }

            if (!this.isReadable()) {
                errors.push('File is not readable');
            }

            if (!this.isWithinSizeLimit()) {
                errors.push('File size exceeds maximum allowed limit');
            }
        }

        if (!this.isSupportedType()) {
            errors.push(`Unsupported file type: ${this.getExtension()}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            fileInfo: {
                path: this.value,
                isUrl: this.isUrl,
                extension: this.getExtension(),
                mimeType: this.getMimeType(),
                size: this.isUrl ? null : (this.exists() ? this.getSize() : null),
                isSupported: this.isSupportedType()
            }
        };
    }

    /**
     * Get URL information if this is a URL
     */
    getUrlInfo() {
        if (!this.isUrl) {
            throw new Error('Not a URL');
        }

        const url = new URL(this.value);
        return {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash,
            fullUrl: this.value
        };
    }

    /**
     * Create a new FilePath instance with a different path
     */
    withPath(newPath) {
        return new FilePath(newPath);
    }

    /**
     * Get string representation
     */
    toString() {
        return this.value;
    }

    /**
     * Compare with another FilePath
     */
    equals(other) {
        if (!(other instanceof FilePath)) {
            return false;
        }
        return this.normalizedPath === other.normalizedPath;
    }

    /**
     * Check if this is a URL
     */
    isUrlPath() {
        return this.isUrl;
    }

    /**
     * Check if this is a local file
     */
    isLocalPath() {
        return !this.isUrl;
    }
}

module.exports = { FilePath };
