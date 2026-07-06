"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeComplaint = analyzeComplaint;
async function analyzeComplaint(complaint) {
    return {
        category: complaint.category,
        urgency: "Medium",
    };
}
