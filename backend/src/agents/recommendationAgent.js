"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecommendation = generateRecommendation;
function generateRecommendation(score) {
    if (score > 80) {
        return "Immediate action required";
    }
    if (score > 50) {
        return "Monitor closely";
    }
    return "Low priority";
}
