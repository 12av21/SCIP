"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRisk = calculateRisk;
function calculateRisk(complaints, pending) {
    return complaints * 5 + pending * 2;
}
