require('dotenv').config();
const { initDatabase, getAllUsers } = require('./db/database');
initDatabase();
const users = getAllUsers();
console.log('Total users:', users.length);
const hospitals = users.filter(u => u.role === 'hospital');
console.log('Hospital users:', JSON.stringify(hospitals.map(u => ({userId: u.userId, orgName: u.orgName}))));
console.log('AES_ENCRYPTION_KEY:', process.env.AES_ENCRYPTION_KEY ? 'SET(' + process.env.AES_ENCRYPTION_KEY.length + ' chars)' : 'NOT SET');

const fs = require('fs');
const path = require('path');
const walletPath = path.join(__dirname, 'wallet');
const h01Path = path.join(walletPath, 'Hospital01.id');
const exists = fs.existsSync(h01Path);
console.log('Hospital01.id exists:', exists);
if (exists) {
  const content = JSON.parse(fs.readFileSync(h01Path, 'utf8'));
  console.log('Hospital01 mspId:', content.mspId);
  console.log('Hospital01 type:', content.type);
}

// Check userMeta
const metaPath = path.join(walletPath, '_userMeta.json');
if (fs.existsSync(metaPath)) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  console.log('Hospital01 meta:', JSON.stringify(meta['Hospital01']));
}
