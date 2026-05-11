'use strict';

// ─── Synthetic Healthcare Data Generator ─────────────────────────────────────
// Produces realistic, analytics-oriented healthcare data using @faker-js/faker.
// Implements: bell-curve timestamps, specialty-weighted diagnoses, activity heat
// realism, analytics outliers, and high-impact storytelling patients.

const { faker } = require('@faker-js/faker');
const crypto = require('crypto');

// ─── Configuration ───────────────────────────────────────────────────────────
const DEFAULT_PASSWORD = 'TestPassword123!';

const SCALE = {
    patients: 25,
    doctors: 5,
    insuranceAgents: 3,
};

// ─── Indian Cities ───────────────────────────────────────────────────────────
const CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
    'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Lucknow',
    'Kochi', 'Chandigarh', 'Coimbatore', 'Bhopal', 'Nagpur',
];

// ─── Hospital Names ──────────────────────────────────────────────────────────
const HOSPITALS = [
    'Apollo Hospitals', 'Fortis Healthcare', 'AIIMS',
    'Max Healthcare', 'Narayana Health', 'Manipal Hospitals',
    'Medanta - The Medicity', 'Kokilaben Dhirubhai Ambani Hospital',
    'Sir Ganga Ram Hospital', 'Lilavati Hospital',
];

// ─── Insurance Companies ─────────────────────────────────────────────────────
const INSURANCE_COMPANIES = [
    'Star Health Insurance', 'ICICI Lombard', 'HDFC Ergo',
    'Bajaj Allianz', 'Max Bupa Health', 'New India Assurance',
    'Niva Bupa', 'Care Health Insurance',
];

// ─── Doctor Specialties with Weighted Diagnoses ──────────────────────────────
const SPECIALTIES = {
    'Cardiology': {
        diagnoses: [
            'Essential Hypertension', 'Chronic Heart Disease', 'Hyperlipidemia',
            'Atrial Fibrillation', 'Coronary Artery Disease', 'Heart Failure',
        ],
        prescriptions: [
            'Amlodipine 5mg OD', 'Atorvastatin 20mg OD', 'Metoprolol 50mg BD',
            'Losartan 50mg OD', 'Aspirin 75mg OD', 'Clopidogrel 75mg OD',
        ],
    },
    'Pulmonology': {
        diagnoses: [
            'Bronchial Asthma', 'Chronic Obstructive Pulmonary Disease',
            'Acute Bronchitis', 'Pneumonia', 'Upper Respiratory Infection',
        ],
        prescriptions: [
            'Salbutamol Inhaler PRN', 'Budesonide Inhaler 200mcg BD',
            'Montelukast 10mg OD', 'Amoxicillin 500mg TDS', 'Azithromycin 500mg OD',
        ],
    },
    'Endocrinology': {
        diagnoses: [
            'Diabetes Mellitus Type 2', 'Hypothyroidism', 'Diabetic Neuropathy',
            'Polycystic Ovary Syndrome', 'Metabolic Syndrome',
        ],
        prescriptions: [
            'Metformin 500mg BD', 'Glimepiride 2mg OD', 'Levothyroxine 50mcg OD',
            'Insulin Glargine 10U SC', 'Sitagliptin 100mg OD',
        ],
    },
    'Neurology': {
        diagnoses: [
            'Migraine', 'Tension Headache', 'Epilepsy',
            'Peripheral Neuropathy', 'Vertigo', 'Cerebrovascular Disease',
        ],
        prescriptions: [
            'Sumatriptan 50mg SOS', 'Topiramate 25mg BD', 'Levetiracetam 500mg BD',
            'Gabapentin 300mg TDS', 'Betahistine 16mg TDS',
        ],
    },
    'General Medicine': {
        diagnoses: [
            'Acute Viral Fever', 'Urinary Tract Infection', 'Gastroesophageal Reflux',
            'Iron Deficiency Anemia', 'Allergic Rhinitis', 'Acute Gastroenteritis',
            'Dengue Fever', 'Vitamin D Deficiency', 'Lower Back Pain',
        ],
        prescriptions: [
            'Paracetamol 650mg TDS', 'Cetirizine 10mg OD', 'Pantoprazole 40mg OD',
            'Ferrous Sulfate 200mg OD', 'Nitrofurantoin 100mg BD',
            'ORS sachets TDS', 'Cholecalciferol 60000IU weekly', 'Diclofenac 50mg BD',
        ],
    },
    'Orthopedics': {
        diagnoses: [
            'Osteoarthritis', 'Lumbar Spondylosis', 'Frozen Shoulder',
            'Ligament Tear', 'Fracture - Distal Radius', 'Cervical Spondylitis',
        ],
        prescriptions: [
            'Diclofenac Gel topical', 'Calcium + Vitamin D3 OD',
            'Etoricoxib 60mg OD', 'Tizanidine 2mg BD', 'Physiotherapy referral',
        ],
    },
    'Psychiatry': {
        diagnoses: [
            'Major Depressive Disorder', 'Generalized Anxiety Disorder',
            'Insomnia', 'Panic Disorder', 'Obsessive Compulsive Disorder',
        ],
        prescriptions: [
            'Escitalopram 10mg OD', 'Clonazepam 0.25mg SOS', 'Sertraline 50mg OD',
            'Zolpidem 5mg HS', 'Fluoxetine 20mg OD',
        ],
    },
};

const SPECIALTY_NAMES = Object.keys(SPECIALTIES);

// ─── General Diagnosis Pool (fallback) ───────────────────────────────────────
const GENERAL_DIAGNOSES = [
    'Acute Viral Fever', 'Urinary Tract Infection', 'Gastroesophageal Reflux',
    'Iron Deficiency Anemia', 'Allergic Rhinitis', 'Migraine',
    'Essential Hypertension', 'Diabetes Mellitus Type 2', 'Bronchial Asthma',
    'Hypothyroidism', 'Osteoarthritis', 'Major Depressive Disorder',
    'Dengue Fever', 'Vitamin D Deficiency', 'Lower Back Pain',
];

const GENERAL_PRESCRIPTIONS = [
    'Paracetamol 650mg TDS', 'Cetirizine 10mg OD', 'Pantoprazole 40mg OD',
    'Metformin 500mg BD', 'Amlodipine 5mg OD', 'Salbutamol Inhaler PRN',
    'Sumatriptan 50mg SOS', 'Ferrous Sulfate 200mg OD', 'Levothyroxine 50mcg OD',
    'Diclofenac 50mg BD', 'Azithromycin 500mg OD', 'Amoxicillin 500mg TDS',
];

// ─── File Name Templates ─────────────────────────────────────────────────────
const FILE_TEMPLATES = [
    { name: 'Blood_Test_Report_{year}.pdf', mime: 'application/pdf' },
    { name: 'MRI_Scan_Brain_{year}.pdf', mime: 'application/pdf' },
    { name: 'X_Ray_Chest_{year}.png', mime: 'image/png' },
    { name: 'ECG_Report_{year}.pdf', mime: 'application/pdf' },
    { name: 'CT_Scan_Abdomen_{year}.pdf', mime: 'application/pdf' },
    { name: 'Ultrasound_Report_{year}.pdf', mime: 'application/pdf' },
    { name: 'Prescription_{month}_{year}.pdf', mime: 'application/pdf' },
    { name: 'Pathology_Report_{year}.pdf', mime: 'application/pdf' },
    { name: 'Discharge_Summary_{year}.pdf', mime: 'application/pdf' },
    { name: 'Vaccination_Record_{year}.pdf', mime: 'application/pdf' },
    { name: 'Allergy_Test_Report_{year}.png', mime: 'image/png' },
    { name: 'Eye_Exam_Report_{year}.pdf', mime: 'application/pdf' },
];

// ─── Insurance Policy Types ──────────────────────────────────────────────────
const POLICY_TYPES = ['Health', 'Life', 'Critical Illness', 'Accident', 'Family Floater'];

// ─── Claim Descriptions ──────────────────────────────────────────────────────
const CLAIM_DESCRIPTIONS = [
    'Hospital admission for acute treatment',
    'Outpatient surgery and post-operative care',
    'Diagnostic imaging and laboratory tests',
    'Emergency room visit and stabilization',
    'Specialist consultation and follow-up treatment',
    'Prescription medication coverage',
    'Physiotherapy and rehabilitation sessions',
    'Chronic condition management program',
    'Annual health checkup and preventive screening',
    'Dental procedure and oral surgery',
];

// ─── Timestamp Generation ────────────────────────────────────────────────────

/**
 * Generate a bell-curve distributed timestamp within the last N months.
 * Most timestamps cluster 1-6 months ago; fewer at extremes.
 *
 * Uses Box-Muller transform for normal distribution.
 *
 * @param {number} [monthsBack=12] – Max months in the past
 * @returns {Date}
 */
const generateBellCurveTimestamp = (monthsBack = 12) => {
    // Box-Muller transform for normal distribution (mean=0.4, stddev=0.2)
    // 0.0 = now, 1.0 = monthsBack ago
    let u1, u2, z;
    do {
        u1 = Math.random();
        u2 = Math.random();
        z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    } while (false);

    // Center around 3 months ago (0.25 of range), spread moderately
    const normalized = 0.35 + z * 0.2;
    const clamped = Math.max(0.01, Math.min(0.99, normalized));

    const now = Date.now();
    const maxMs = monthsBack * 30 * 24 * 60 * 60 * 1000;
    const offsetMs = clamped * maxMs;

    const date = new Date(now - offsetMs);

    // Apply activity heat — weight toward 9AM-7PM
    const hour = weightedHour();
    date.setHours(hour, faker.number.int({ min: 0, max: 59 }), faker.number.int({ min: 0, max: 59 }));

    return date;
};

/**
 * Generate an hour weighted toward healthcare working hours (9AM–7PM).
 * ~80% of activity falls in 9-19, ~20% outside.
 * @returns {number} Hour 0-23
 */
const weightedHour = () => {
    if (Math.random() < 0.80) {
        // Working hours: 9–19
        return faker.number.int({ min: 9, max: 19 });
    }
    // Off-hours: 0–8 or 20–23
    return Math.random() < 0.5
        ? faker.number.int({ min: 6, max: 8 })
        : faker.number.int({ min: 20, max: 22 });
};

/**
 * Format a Date as ISO string for SQLite/chaincode compatibility.
 */
const toISO = (date) => date.toISOString();

// ─── Name Generation ─────────────────────────────────────────────────────────

const INDIAN_FIRST_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
    'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Priya', 'Aisha', 'Saanvi', 'Kavya',
    'Riya', 'Neha', 'Pooja', 'Meera', 'Rohan', 'Karthik', 'Amit', 'Rahul',
    'Suresh', 'Vikram', 'Deepak', 'Manish', 'Rajesh', 'Sandeep', 'Anjali',
    'Sneha', 'Lakshmi', 'Divya', 'Nisha', 'Tanvi', 'Shruti', 'Pallavi',
    'Swati', 'Rashmi', 'Harsh', 'Dev', 'Nikhil', 'Pranav', 'Gaurav',
];

const INDIAN_LAST_NAMES = [
    'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Joshi', 'Verma', 'Mehta',
    'Shah', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Rao', 'Das', 'Mukherjee',
    'Chatterjee', 'Banerjee', 'Pillai', 'Agarwal', 'Malhotra', 'Kapoor',
    'Chauhan', 'Bhat', 'Sinha', 'Thakur', 'Mishra', 'Tiwari', 'Deshmukh',
    'Kulkarni',
];

const generateIndianName = () => {
    const first = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)];
    const last = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)];
    return `${first} ${last}`;
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickRandomN = (arr, n) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
};

// ─── DOB Generation ──────────────────────────────────────────────────────────
const generateDOB = (minAge = 18, maxAge = 75) => {
    const now = new Date();
    const age = faker.number.int({ min: minAge, max: maxAge });
    const dob = new Date(now.getFullYear() - age, faker.number.int({ min: 0, max: 11 }), faker.number.int({ min: 1, max: 28 }));
    return dob.toISOString().split('T')[0]; // YYYY-MM-DD
};

// ─── Data Generation Functions ───────────────────────────────────────────────

/**
 * Generate the complete synthetic dataset.
 * @param {Object} [scale] – Override default scale
 * @returns {Object} Complete dataset with all entity arrays
 */
const generateDataset = (scale = SCALE) => {
    const dataset = {
        patients: [],
        doctors: [],
        insuranceAgents: [],
        demoAccounts: [],
        // Will be populated by seeders:
        consentMap: [],        // { patientUUID, doctorUUID, patientUserId, doctorUserId }
        revocationCase: null,  // { patientUUID, doctorUUID, ... }
    };

    // ── Demo Accounts (deterministic) ────────────────────────────────────────
    dataset.demoAccounts = [
        {
            name: 'Demo Patient', email: 'demo.patient@ehr.com', role: 'patient',
            city: 'Mumbai', dob: '1990-05-15',
            isShowcase: true, // High-impact storytelling patient
        },
        {
            name: 'Demo Doctor', email: 'demo.doctor@ehr.com', role: 'doctor',
            city: 'Delhi', hospitalName: 'Apollo Hospitals',
            specialty: 'General Medicine',
            isOutlier: true, // Analytics outlier — very active doctor
        },
        {
            name: 'Demo Insurance Agent', email: 'demo.insurance@ehr.com', role: 'insuranceAgent',
            city: 'Bangalore', insuranceCompany: 'Star Health Insurance',
        },
        {
            name: 'Hospital Administrator', email: 'demo.admin@ehr.com', role: 'hospital',
            city: 'Mumbai', hospitalName: 'AIIMS',
            fabricUserId: 'Hospital01', // Links to existing bootstrap identity
        },
        {
            name: 'Insurance Administrator', email: 'demo.insuranceadmin@ehr.com', role: 'insuranceAdmin',
            city: 'Delhi', insuranceCompany: 'Star Health Insurance',
            fabricUserId: 'insuranceCompany01', // Links to existing bootstrap identity
        },
    ];

    // ── Patients ─────────────────────────────────────────────────────────────
    // 2 additional showcase patients (chronic conditions)
    const showcasePatients = [
        {
            name: 'Rajesh Verma', email: 'synth_pat_showcase1@ehr.demo', role: 'patient',
            city: 'Chennai', dob: '1965-03-22',
            isShowcase: true, // Chronic heart disease + diabetes
            showcaseConditions: ['Cardiology', 'Endocrinology'],
        },
        {
            name: 'Meera Nair', email: 'synth_pat_showcase2@ehr.demo', role: 'patient',
            city: 'Hyderabad', dob: '1978-11-08',
            isShowcase: true, // Long-term asthma + depression
            showcaseConditions: ['Pulmonology', 'Psychiatry'],
        },
    ];

    dataset.patients.push(...showcasePatients);

    // Regular patients
    for (let i = 1; i <= scale.patients; i++) {
        const padded = String(i).padStart(2, '0');
        dataset.patients.push({
            name: generateIndianName(),
            email: `synth_pat_${padded}@ehr.demo`,
            role: 'patient',
            city: pickRandom(CITIES),
            dob: generateDOB(),
            isShowcase: false,
            // Weighted record count: most 5-8, some 9-15 (analytics variation)
            targetRecords: Math.random() < 0.2
                ? faker.number.int({ min: 10, max: 15 })
                : faker.number.int({ min: 5, max: 9 }),
            // Weighted claim probability
            claimProbability: Math.random() < 0.35 ? 'high' : Math.random() < 0.5 ? 'medium' : 'low',
        });
    }

    // ── Doctors ───────────────────────────────────────────────────────────────
    for (let i = 1; i <= scale.doctors; i++) {
        const padded = String(i).padStart(2, '0');
        const specialty = SPECIALTY_NAMES[i % SPECIALTY_NAMES.length];
        dataset.doctors.push({
            name: `Dr. ${generateIndianName()}`,
            email: `synth_doc_${padded}@ehr.demo`,
            role: 'doctor',
            city: pickRandom(CITIES),
            hospitalName: pickRandom(HOSPITALS),
            specialty,
            // One doctor is analytics outlier (very active)
            isOutlier: i === 1,
        });
    }

    // ── Insurance Agents ─────────────────────────────────────────────────────
    for (let i = 1; i <= scale.insuranceAgents; i++) {
        const padded = String(i).padStart(2, '0');
        dataset.insuranceAgents.push({
            name: generateIndianName(),
            email: `synth_ins_${padded}@ehr.demo`,
            role: 'insuranceAgent',
            city: pickRandom(CITIES),
            insuranceCompany: INSURANCE_COMPANIES[i % INSURANCE_COMPANIES.length],
        });
    }

    return dataset;
};

/**
 * Get specialty-weighted diagnosis and prescription for a doctor.
 * @param {string} specialty – Doctor's specialty
 * @returns {{ diagnosis: string, prescription: string }}
 */
const getSpecialtyDiagnosis = (specialty) => {
    const spec = SPECIALTIES[specialty];
    if (spec && Math.random() < 0.75) {
        // 75% chance of specialty-relevant diagnosis
        return {
            diagnosis: pickRandom(spec.diagnoses),
            prescription: pickRandom(spec.prescriptions),
        };
    }
    // 25% fallback to general
    return {
        diagnosis: pickRandom(GENERAL_DIAGNOSES),
        prescription: pickRandom(GENERAL_PRESCRIPTIONS),
    };
};

/**
 * Generate a realistic file metadata entry.
 * @param {number} index
 * @returns {{ fileName: string, mimeType: string, fileSize: number, timestamp: Date }}
 */
const generateFileEntry = (index) => {
    const template = FILE_TEMPLATES[index % FILE_TEMPLATES.length];
    const ts = generateBellCurveTimestamp();
    const year = ts.getFullYear();
    const month = ts.toLocaleString('en-US', { month: 'short' });

    const fileName = template.name
        .replace('{year}', year)
        .replace('{month}', month);

    return {
        fileName,
        mimeType: template.mime,
        fileSize: faker.number.int({ min: 50000, max: 2000000 }), // 50KB–2MB
        timestamp: ts,
    };
};

/**
 * Generate insurance policy parameters.
 * @returns {Object}
 */
const generatePolicy = () => {
    const validFrom = generateBellCurveTimestamp(18);
    const durationMonths = faker.number.int({ min: 6, max: 24 });
    const validTo = new Date(validFrom);
    validTo.setMonth(validTo.getMonth() + durationMonths);

    return {
        coverageAmount: String(pickRandom([100000, 200000, 300000, 500000, 750000, 1000000])),
        policyType: pickRandom(POLICY_TYPES),
        validFrom: toISO(validFrom),
        validTo: toISO(validTo),
    };
};

/**
 * Generate a claim for a policy.
 * @param {number} coverageAmount
 * @returns {Object}
 */
const generateClaim = (coverageAmount) => {
    const maxClaim = Math.min(Number(coverageAmount), 500000);
    return {
        claimAmount: String(faker.number.int({ min: 5000, max: maxClaim })),
        description: pickRandom(CLAIM_DESCRIPTIONS),
    };
};

/**
 * Determine claim decision with realistic distribution.
 * ~60% approved, ~25% rejected, ~15% pending (no action)
 * @returns {{ decision: string, reason: string } | null}
 */
const generateClaimDecision = () => {
    const roll = Math.random();
    if (roll < 0.60) {
        return {
            decision: 'APPROVED',
            reason: pickRandom([
                'All documentation verified and claim amount within policy coverage.',
                'Valid medical records submitted. Claim approved per policy terms.',
                'Hospital expenses verified. Approved for reimbursement.',
            ]),
        };
    }
    if (roll < 0.85) {
        return {
            decision: 'REJECTED',
            reason: pickRandom([
                'Pre-existing condition exclusion applies.',
                'Claim amount exceeds policy sub-limits.',
                'Insufficient supporting documentation provided.',
                'Waiting period not yet completed for this condition.',
            ]),
        };
    }
    // 15% remain pending — no decision action
    return null;
};

module.exports = {
    DEFAULT_PASSWORD,
    SCALE,
    SPECIALTIES,
    generateDataset,
    getSpecialtyDiagnosis,
    generateFileEntry,
    generatePolicy,
    generateClaim,
    generateClaimDecision,
    generateBellCurveTimestamp,
    toISO,
    pickRandom,
    pickRandomN,
};
