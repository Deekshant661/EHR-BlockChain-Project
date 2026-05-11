require('dotenv').config();
const { registerAndEnrollUser } = require('./fabric/identityManager');
const { ORG_CONFIG } = require('./constants');

(async () => {
  try {
    console.log('Enrolling demo identities...');

    // 1. Hospital Admin (Org1)
    await registerAndEnrollUser({
        userId: 'demo.admin@ehr.com',
        role: 'hospital',
        orgName: 'Org1',
        adminLabel: ORG_CONFIG['Org1'].adminIdentity
    });

    // 2. Doctor (Org1)
    await registerAndEnrollUser({
        userId: 'demo.doctor@ehr.com',
        role: 'doctor',
        orgName: 'Org1',
        adminLabel: ORG_CONFIG['Org1'].adminIdentity
    });

    // 3. Patient (Org1)
    await registerAndEnrollUser({
        userId: 'demo.patient@ehr.com',
        role: 'patient',
        orgName: 'Org1',
        adminLabel: ORG_CONFIG['Org1'].adminIdentity
    });

    // 4. Insurance Admin (Org2)
    await registerAndEnrollUser({
        userId: 'demo.insuranceadmin@ehr.com',
        role: 'insuranceAdmin',
        orgName: 'Org2',
        adminLabel: ORG_CONFIG['Org2'].adminIdentity
    });

    console.log('✓ Demo identities successfully enrolled in wallet!');
  } catch (e) {
    console.error('✗ Enrollment failed:', e.message);
  }
})();
