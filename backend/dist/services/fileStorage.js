"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComplaints = getComplaints;
exports.saveComplaint = saveComplaint;
exports.updateComplaintStatus = updateComplaintStatus;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const FILE_PATH = path_1.default.join(process.cwd(), "data", "complaints.json");
async function getComplaints() {
    try {
        const data = await promises_1.default.readFile(FILE_PATH, "utf-8");
        return JSON.parse(data);
    }
    catch {
        return [];
    }
}
async function saveComplaint(complaint) {
    const complaints = await getComplaints();
    complaints.push(complaint);
    await promises_1.default.writeFile(FILE_PATH, JSON.stringify(complaints, null, 2));
}
async function updateComplaintStatus(id, status) {
    const complaints = await getComplaints();
    const updated = complaints.map((item) => item.id === id
        ? { ...item, status }
        : item);
    await promises_1.default.writeFile(FILE_PATH, JSON.stringify(updated, null, 2));
    return updated;
}
