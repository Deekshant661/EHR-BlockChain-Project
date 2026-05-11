'use strict';

// ─── Colored Console Logger for Seed Scripts ─────────────────────────────────
// Provides structured, phase-tagged logging with progress tracking.

const COLORS = {
    reset:   '\x1b[0m',
    bright:  '\x1b[1m',
    dim:     '\x1b[2m',
    green:   '\x1b[32m',
    yellow:  '\x1b[33m',
    blue:    '\x1b[34m',
    magenta: '\x1b[35m',
    cyan:    '\x1b[36m',
    red:     '\x1b[31m',
    white:   '\x1b[37m',
    bgGreen: '\x1b[42m',
    bgRed:   '\x1b[41m',
    bgBlue:  '\x1b[44m',
};

const c = COLORS;

/**
 * Create a tagged logger for a specific seed phase.
 * @param {string} phase – e.g. 'Users', 'Consents', 'Records'
 * @returns {Object} Logger with info, warn, error, success, progress methods
 */
const createLogger = (phase) => {
    const tag = `${c.cyan}[Seed:${phase}]${c.reset}`;

    return {
        info:     (msg) => console.log(`${tag} ${msg}`),
        warn:     (msg) => console.log(`${tag} ${c.yellow}⚠ ${msg}${c.reset}`),
        error:    (msg) => console.error(`${tag} ${c.red}✗ ${msg}${c.reset}`),
        success:  (msg) => console.log(`${tag} ${c.green}✓ ${msg}${c.reset}`),
        progress: (current, total, msg) => {
            const pct = Math.round((current / total) * 100);
            const bar = `[${current}/${total}]`;
            console.log(`${tag} ${c.dim}${bar}${c.reset} ${c.white}${msg}${c.reset} ${c.dim}(${pct}%)${c.reset}`);
        },
        skip:     (msg) => console.log(`${tag} ${c.yellow}↷ SKIP: ${msg}${c.reset}`),
        header:   (msg) => {
            console.log('');
            console.log(`${c.bright}${c.bgBlue} ${msg} ${c.reset}`);
            console.log('');
        },
    };
};

/**
 * Print a final summary table after seeding completes.
 */
const printSummary = (stats) => {
    console.log('');
    console.log(`${c.bright}${c.bgGreen} ═══ SEED COMPLETE ═══ ${c.reset}`);
    console.log('');
    console.log(`  ${c.cyan}Patients:${c.reset}         ${stats.patients || 0}`);
    console.log(`  ${c.cyan}Doctors:${c.reset}          ${stats.doctors || 0}`);
    console.log(`  ${c.cyan}Insurance Agents:${c.reset} ${stats.insuranceAgents || 0}`);
    console.log(`  ${c.cyan}Admin Accounts:${c.reset}   ${stats.admins || 0}`);
    console.log(`  ${c.cyan}Consents Granted:${c.reset} ${stats.consents || 0}`);
    console.log(`  ${c.cyan}Consents Revoked:${c.reset} ${stats.revocations || 0}`);
    console.log(`  ${c.cyan}Medical Records:${c.reset}  ${stats.records || 0}`);
    console.log(`  ${c.cyan}Insurance Policies:${c.reset}${stats.policies || 0}`);
    console.log(`  ${c.cyan}Insurance Claims:${c.reset} ${stats.claims || 0}`);
    console.log(`  ${c.cyan}File Entries:${c.reset}     ${stats.files || 0}`);
    console.log(`  ${c.cyan}Elapsed Time:${c.reset}     ${stats.elapsed || '?'}s`);
    console.log('');
};

/**
 * Print demo credentials table.
 */
const printCredentials = (creds) => {
    console.log(`${c.bright}${c.bgBlue} ═══ DEMO CREDENTIALS ═══ ${c.reset}`);
    console.log('');
    console.log(`  ${c.dim}Password for ALL synthetic users:${c.reset} ${c.bright}TestPassword123!${c.reset}`);
    console.log('');
    console.log(`  ${c.bright}Role${c.reset}               ${c.bright}Email${c.reset}`);
    console.log(`  ${'─'.repeat(50)}`);
    creds.forEach(({ role, email }) => {
        console.log(`  ${c.cyan}${role.padEnd(18)}${c.reset} ${email}`);
    });
    console.log('');
};

module.exports = { createLogger, printSummary, printCredentials };
