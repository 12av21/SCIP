-- SCIP Database Seed Data
-- Initial data for Smart Community Intelligence Platform

-- Seed Admin User
-- Password: Admin@123 (hashed with bcrypt, salt rounds = 10)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_verified, created_at)
VALUES (
    'admin-seed-1',
    'Super User',
    'admin@scip.gov',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin',
    1,
    datetime('now')
);

-- Seed Sample Citizens
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_verified, created_at)
VALUES 
    ('citizen-1', 'John Doe', 'john@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'citizen', 1, datetime('now')),
    ('citizen-2', 'Jane Smith', 'jane@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'citizen', 1, datetime('now')),
    ('citizen-3', 'Bob Johnson', 'bob@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'citizen', 1, datetime('now'));

-- Seed Sample Complaints
INSERT OR IGNORE INTO complaints (id, title, description, category, location, status, created_at, priority_score, priority_level, user_id)
VALUES 
    ('comp-1', 'Water pipe burst on Main Street', 'A major water pipe has burst causing flooding in the area. Urgent repair needed.', 'Water', 'Sector 4', 'Pending', datetime('now', '-2 days'), 85, 'Critical', 'citizen-1'),
    ('comp-2', 'Street light not working', 'The street light at the intersection has been non-functional for a week.', 'Electricity', 'Sector 2', 'In Progress', datetime('now', '-3 days'), 45, 'Medium', 'citizen-2'),
    ('comp-3', 'Garbage collection missed', 'Garbage collection was skipped this week. Piles accumulating.', 'Waste', 'Sector 1', 'Resolved', datetime('now', '-5 days'), 30, 'Low', 'citizen-3'),
    ('comp-4', 'Pothole on highway', 'Large pothole causing damage to vehicles. Needs immediate attention.', 'Road', 'Sector 3', 'Pending', datetime('now', '-1 day'), 65, 'High', 'citizen-1'),
    ('comp-5', 'Power outage in residential area', 'Frequent power outages affecting daily life.', 'Electricity', 'Sector 5', 'Pending', datetime('now'), 55, 'Medium', 'citizen-2'),
    ('comp-6', 'Contaminated water supply', 'Water appears murky and unsafe for consumption.', 'Water', 'Sector 6', 'In Progress', datetime('now', '-4 days'), 90, 'Critical', 'citizen-3'),
    ('comp-7', 'Blocked drainage system', 'Drainage channels blocked causing water logging.', 'Water', 'Sector 2', 'Resolved', datetime('now', '-7 days'), 40, 'Medium', 'citizen-1'),
    ('comp-8', 'Damaged road signage', 'Important road signs damaged or missing.', 'Road', 'Sector 4', 'Pending', datetime('now', '-6 hours'), 35, 'Low', 'citizen-2');

-- Seed User Settings for Admin
INSERT OR IGNORE INTO user_settings (user_id, receive_email_notifications, receive_push_notifications, language, timezone)
VALUES ('admin-seed-1', 1, 1, 'en', 'UTC');

-- Seed User Settings for Citizens
INSERT OR IGNORE INTO user_settings (user_id, receive_email_notifications, receive_push_notifications, language, timezone)
VALUES 
    ('citizen-1', 1, 1, 'en', 'UTC'),
    ('citizen-2', 0, 1, 'en', 'UTC'),
    ('citizen-3', 1, 0, 'en', 'UTC');
