const bcrypt = require('bcryptjs');
const hash = '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m';
console.log('AdminPass123!', bcrypt.compareSync('AdminPass123!', hash));
console.log('CitizenPass123!', bcrypt.compareSync('CitizenPass123!', hash));
console.log('DirectorPass123!', bcrypt.compareSync('DirectorPass123!', hash));
console.log('DeptPass123!', bcrypt.compareSync('DeptPass123!', hash));
console.log('OfficerPass123!', bcrypt.compareSync('OfficerPass123!', hash));
console.log('AnalystPass123!', bcrypt.compareSync('AnalystPass123!', hash));