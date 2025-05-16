// Quick verification script to check the build
const fs = require('fs');
const path = require('path');

console.log('Verifying Bitcoin Price Tag build...\n');

// Check if dist directory exists
if (!fs.existsSync('dist')) {
    console.error('❌ Error: dist directory not found. Run "pnpm build" first.');
    process.exit(1);
}

// Files that should exist in the build
const requiredFiles = [
    'dist/manifest.json',
    'dist/styles.css',
    'dist/service-worker/index.js',
    'dist/content-script/index.js',
    'dist/images/icon_16.png',
    'dist/images/icon_48.png',
    'dist/images/icon_128.png',
];

let hasErrors = false;

// Check each required file
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✓ ${file}`);
    } else {
        console.error(`❌ Missing: ${file}`);
        hasErrors = true;
    }
});

// Check manifest.json content
console.log('\nChecking manifest.json...');
try {
    const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));
    
    if (manifest.manifest_version === 3) {
        console.log('✓ Manifest version 3');
    } else {
        console.error('❌ Wrong manifest version:', manifest.manifest_version);
        hasErrors = true;
    }
    
    if (manifest.background?.service_worker) {
        console.log('✓ Service worker defined');
    } else {
        console.error('❌ Service worker not defined');
        hasErrors = true;
    }
    
    if (manifest.content_scripts?.[0]?.js?.includes('content-script/index.js')) {
        console.log('✓ Content script defined');
    } else {
        console.error('❌ Content script not properly defined');
        hasErrors = true;
    }
    
    if (manifest.permissions?.includes('storage') && manifest.permissions?.includes('alarms')) {
        console.log('✓ Required permissions present');
    } else {
        console.error('❌ Missing required permissions');
        hasErrors = true;
    }
    
    if (manifest.host_permissions?.includes('*://api.coindesk.com/*')) {
        console.log('✓ Host permissions present');
    } else {
        console.error('❌ Missing host permissions');
        hasErrors = true;
    }
} catch (error) {
    console.error('❌ Error reading manifest.json:', error.message);
    hasErrors = true;
}

// Final result
console.log('\n' + (hasErrors ? '❌ Build verification FAILED' : '✅ Build verification PASSED'));