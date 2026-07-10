import fs from "fs/promises";
import path from "path";
import Complaint from "../models/Complaint";

const JSON_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "complaints.json"
);

// Read fallback seed data from local file
async function loadJSONSeeds(): Promise<any[]> {
  try {
    const data = await fs.readFile(JSON_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load JSON seed fallback file:", error);
    return [];
  }
}

export async function getComplaints(): Promise<any[]> {
  try {
    // 1. Fetch complaints from MongoDB
    let dbComplaints: any[] = await Complaint.find({});
    
    // 2. If MongoDB is empty, seed it with the existing json seed data
    if (dbComplaints.length === 0) {
      console.log("MongoDB complaints collection is empty. Seeding from local files...");
      const seedData = await loadJSONSeeds();
      if (seedData.length > 0) {
        dbComplaints = await Complaint.insertMany(seedData);
        console.log(`Successfully seeded ${dbComplaints.length} complaints to MongoDB.`);
      }
    }

    // Convert Mongoose documents to plain objects with virtual mappings
    return dbComplaints.map(doc => doc.toJSON());
  } catch (error) {
    console.error("Error reading complaints from MongoDB:", error);
    // Safe fallback to JSON seeds directly in case of database connectivity hiccup
    return await loadJSONSeeds();
  }
}

export async function saveComplaint(complaint: any): Promise<void> {
  try {
    const newDoc = new Complaint({
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      location: complaint.location,
      status: complaint.status || "Pending",
      lat: complaint.lat,
      lng: complaint.lng,
      createdAt: complaint.createdAt,
      aiSuggestion: complaint.aiSuggestion || null
    });
    await newDoc.save();
    console.log(`Complaint ${complaint.id} successfully written to MongoDB.`);
  } catch (error) {
    console.error("Error saving complaint to MongoDB:", error);
    throw error;
  }
}

export async function updateComplaintStatus(id: string, status: string): Promise<any[]> {
  try {
    // Update the targeted complaint matching custom string id or _id
    const res = await Complaint.findOneAndUpdate(
      { $or: [{ id: id }, { _id: id }] },
      { status },
      { new: true }
    );
    if (!res) {
      console.warn(`No complaint found with ID: ${id}`);
    }
    // Return all complaints in active state representation
    return await getComplaints();
  } catch (error) {
    console.error("Error updating complaint status in MongoDB:", error);
    throw error;
  }
}
