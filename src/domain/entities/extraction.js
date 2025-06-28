const { Schema } = require("./schema");

class ExtractionResult {
  constructor(documentId, extractedData, schema, options = {}) {
    this.documentId = documentId;
    this.extractedData = extractedData;
    this.schema = schema;
    this.confidence = options.confidence || 0;
    this.processingTime = options.processingTime || 0;
    this.createdAt = new Date();
    this.status = options.status || "completed"; // completed, failed, partial
    this.errors = options.errors || [];
    this.warnings = options.warnings || [];
    this.metadata = options.metadata || {};

    // Validate and process the result
    this.validateResult();
  }

  /**
   * Validate extraction result against schema
   */
  validateResult() {
    if (!this.schema) {
      throw new Error("Schema is required for extraction result validation");
    }

    // Validate data against schema
    const validation = this.schema.validateData(this.extractedData);

    if (!validation.isValid) {
      this.status = "failed";
      this.errors = validation.errors;
      // Don't throw error, just mark as failed for testing and analysis purposes
      return validation;
    }

    // Update extracted data with validated data
    this.extractedData = validation.data;

    // Calculate confidence if not provided
    if (this.confidence === 0) {
      this.confidence = this.calculateConfidence();
    }

    return validation;
  }

  /**
   * Calculate confidence score based on data quality
   */
  calculateConfidence() {
    if (!this.extractedData || Object.keys(this.extractedData).length === 0) {
      return 0;
    }

    let totalScore = 0;
    let fieldCount = 0;

    for (const [fieldName, value] of Object.entries(this.extractedData)) {
      const fieldScore = this.calculateFieldConfidence(fieldName, value);
      totalScore += fieldScore;
      fieldCount++;
    }

    return fieldCount > 0 ? totalScore / fieldCount : 0;
  }

  /**
   * Calculate confidence for individual field
   */
  calculateFieldConfidence(fieldName, value) {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    let score = 1.0; // Base score

    // Reduce score for empty or null values
    if (typeof value === "string" && value.trim().length === 0) {
      score *= 0.1;
    }

    // Reduce score for very short values (might be incomplete)
    if (typeof value === "string" && value.length < 2) {
      score *= 0.5;
    }

    // Reduce score for values that look like placeholders
    if (typeof value === "string" && this.isPlaceholder(value)) {
      score *= 0.2;
    }

    // Check if field is required and has value
    if (this.schema.isFieldRequired(fieldName) && value) {
      score *= 1.2; // Boost score for required fields with values
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if value looks like a placeholder
   */
  isPlaceholder(value) {
    if (typeof value !== "string") return false;

    const placeholderPatterns = [
      /^[A-Z\s]+$/, // All caps
      /^[0-9\s]+$/, // All numbers
      /^[Xx\s]+$/, // All X's
      /^[Nn][Aa]$/, // N/A
      /^[Tt][Bb][Dd]$/, // TBD
      /^[Pp][Ll][Ee][Aa][Ss][Ee]\s+[Ee][Nn][Tt][Ee][Rr]/, // Please enter
      /^[Ee][Nn][Tt][Ee][Rr]\s+[Hh][Ee][Rr][Ee]/, // Enter here
    ];

    return placeholderPatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Check if extraction result is valid
   */
  isValid() {
    return this.status === "completed" && this.errors.length === 0;
  }

  /**
   * Check if extraction result has warnings
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel() {
    if (this.confidence >= 0.9) return "high";
    if (this.confidence >= 0.7) return "medium";
    if (this.confidence >= 0.5) return "low";
    return "very_low";
  }

  /**
   * Get missing required fields
   */
  getMissingRequiredFields() {
    const requiredFields = this.schema.getRequiredFields();
    const missingFields = [];

    for (const fieldName of requiredFields) {
      const value = this.extractedData[fieldName];
      if (!value || (typeof value === "string" && value.trim().length === 0)) {
        missingFields.push(fieldName);
      }
    }

    return missingFields;
  }

  /**
   * Get filled fields count
   */
  getFilledFieldsCount() {
    let count = 0;
    for (const value of Object.values(this.extractedData)) {
      if (value && (typeof value !== "string" || value.trim().length > 0)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage() {
    const totalFields = this.schema.getFieldNames().length;
    const filledFields = this.getFilledFieldsCount();
    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  }

  /**
   * Get field value with validation
   */
  getField(fieldName) {
    if (!this.schema.getField(fieldName)) {
      throw new Error(`Field '${fieldName}' not found in schema`);
    }

    return {
      value: this.extractedData[fieldName],
      isRequired: this.schema.isFieldRequired(fieldName),
      confidence: this.calculateFieldConfidence(
        fieldName,
        this.extractedData[fieldName]
      ),
    };
  }

  /**
   * Update field value
   */
  updateField(fieldName, value) {
    if (!this.schema.getField(fieldName)) {
      throw new Error(`Field '${fieldName}' not found in schema`);
    }

    this.extractedData[fieldName] = value;

    // Revalidate the result
    this.validateResult();

    return this;
  }

  /**
   * Add warning to the result
   */
  addWarning(message, field = null) {
    this.warnings.push({
      message,
      field,
      timestamp: new Date(),
    });
  }

  /**
   * Add error to the result
   */
  addError(message, field = null) {
    this.errors.push({
      message,
      field,
      timestamp: new Date(),
    });
    this.status = "failed";
  }

  /**
   * Get extraction summary
   */
  getSummary() {
    return {
      documentId: this.documentId,
      status: this.status,
      confidence: this.confidence,
      confidenceLevel: this.getConfidenceLevel(),
      completionPercentage: this.getCompletionPercentage(),
      filledFields: this.getFilledFieldsCount(),
      totalFields: this.schema.getFieldNames().length,
      missingRequiredFields: this.getMissingRequiredFields(),
      processingTime: this.processingTime,
      errors: this.errors.length,
      warnings: this.warnings.length,
      createdAt: this.createdAt,
    };
  }

  /**
   * Get detailed report
   */
  getDetailedReport() {
    const report = {
      summary: this.getSummary(),
      fields: {},
      schema: this.schema.getSummary(),
    };

    // Add field details
    for (const fieldName of this.schema.getFieldNames()) {
      const fieldValue = this.extractedData[fieldName];
      report.fields[fieldName] = {
        value: fieldValue,
        isRequired: this.schema.isFieldRequired(fieldName),
        confidence: this.calculateFieldConfidence(fieldName, fieldValue),
        isEmpty:
          !fieldValue ||
          (typeof fieldValue === "string" && fieldValue.trim().length === 0),
      };
    }

    return report;
  }

  /**
   * Export result as JSON
   */
  toJSON() {
    return {
      documentId: this.documentId,
      extractedData: this.extractedData,
      confidence: this.confidence,
      processingTime: this.processingTime,
      status: this.status,
      errors: this.errors,
      warnings: this.warnings,
      metadata: this.metadata,
      createdAt: this.createdAt,
      summary: this.getSummary(),
    };
  }

  /**
   * Create a new ExtractionResult with updated data
   */
  withUpdatedData(newData, options = {}) {
    return new ExtractionResult(this.documentId, newData, this.schema, {
      confidence: options.confidence || this.confidence,
      processingTime: options.processingTime || this.processingTime,
      status: options.status || this.status,
      errors: options.errors || this.errors,
      warnings: options.warnings || this.warnings,
      metadata: { ...this.metadata, ...options.metadata },
    });
  }

  /**
   * Merge with another extraction result
   */
  merge(otherResult) {
    if (this.documentId !== otherResult.documentId) {
      throw new Error("Cannot merge results from different documents");
    }

    const mergedData = { ...this.extractedData, ...otherResult.extractedData };
    const mergedErrors = [...this.errors, ...otherResult.errors];
    const mergedWarnings = [...this.warnings, ...otherResult.warnings];
    const mergedMetadata = { ...this.metadata, ...otherResult.metadata };

    return new ExtractionResult(this.documentId, mergedData, this.schema, {
      confidence: Math.max(this.confidence, otherResult.confidence),
      processingTime: this.processingTime + otherResult.processingTime,
      status:
        this.status === "completed" && otherResult.status === "completed"
          ? "completed"
          : "partial",
      errors: mergedErrors,
      warnings: mergedWarnings,
      metadata: mergedMetadata,
    });
  }

  /**
   * Validate result against business rules
   */
  validateBusinessRules() {
    const violations = [];

    // Check for missing required fields
    const missingRequired = this.getMissingRequiredFields();
    if (missingRequired.length > 0) {
      violations.push({
        rule: "required_fields",
        message: `Missing required fields: ${missingRequired.join(", ")}`,
        severity: "error",
      });
    }

    // Check confidence threshold
    if (this.confidence < 0.5) {
      violations.push({
        rule: "confidence_threshold",
        message: `Confidence score ${this.confidence} is below threshold of 0.5`,
        severity: "warning",
      });
    }

    // Check completion percentage
    if (this.getCompletionPercentage() < 50) {
      violations.push({
        rule: "completion_threshold",
        message: `Completion percentage ${this.getCompletionPercentage()}% is below threshold of 50%`,
        severity: "warning",
      });
    }

    return {
      isValid: violations.filter((v) => v.severity === "error").length === 0,
      violations,
    };
  }
}

module.exports = { ExtractionResult };
