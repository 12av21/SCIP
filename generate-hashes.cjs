const bcrypt = require('bcryptjs');

const passwords = {
  'AdminPass123!': 'admin',
  'DirectorPass123!': 'authority',
  'AnalystPass123!': 'analyst',
  'DeptPass123!': 'dept_officer',
  'OfficerPass123!': 'officer',
  'CitizenPass123!': 'citizen'
};

for (const [password, role] of Object.entries(passwords)) {
  const hash = bcrypt.hashSync(password, 10);
  console.log(`${role}: ${hash}`);
}