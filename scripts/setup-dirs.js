#!/usr/bin/env node
/**
 * Setup directories - cross-platform script
 */

const fs = require('fs');
const path = require('path');

const directories = [
    'uploads/incoming',
    'uploads/processing', 
    'uploads/converted',
    'uploads/expired',
    'uploads/quarantine',
    'logs',
    'temp',
    'backups',
    'src/logs',
    'infra/prometheus/data',
    'infra/grafana/data'
];

console.log('📁 Setting up directories...');

directories.forEach(dir => {
    try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created: ${dir}`);
    } catch (err) {
        if (err.code === 'EEXIST') {
            console.log(`✓ Exists: ${dir}`);
        } else {
            console.error(`❌ Error creating ${dir}:`, err.message);
        }
    }
});

console.log('🎉 Directory setup complete!');