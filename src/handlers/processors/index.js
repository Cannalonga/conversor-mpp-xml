/**
 * Handlers Index
 * 
 * Export all conversion handlers from a single point.
 */

const { handleMppToXml, checkMicroserviceHealth } = require('./mpp-to-xml');
const { 
    handleGenericConversion,
    handleImageConversion,
    handleDocumentConversion,
    handleMediaConversion,
    handleMockConversion,
    getOutputExtension
} = require('./generic');

module.exports = {
    // MPP specific
    handleMppToXml,
    checkMicroserviceHealth,
    
    // Generic handlers
    handleGenericConversion,
    handleImageConversion,
    handleDocumentConversion,
    handleMediaConversion,
    handleMockConversion,
    
    // Utilities
    getOutputExtension
};
