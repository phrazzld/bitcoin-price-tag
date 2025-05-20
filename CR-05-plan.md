# CR-05 Plan: Organize Legacy Manifest V2 Files

## Context
The repository contains legacy Manifest V2 files (`content.js` and root `manifest.json`) that are being actively modified despite being functionally unused. These files need to be clearly archived and documented to avoid confusion and unnecessary maintenance.

## Implementation Approach

1. Create an archive directory structure:
   - Create `archive/manifest-v2/` directory to house the legacy files
   - Add a README.md in this directory explaining the purpose of these files

2. Move legacy files:
   - Move `content.js` to `archive/manifest-v2/content.js`
   - Move root `manifest.json` to `archive/manifest-v2/manifest.json`

3. Revert non-essential functional changes:
   - Identify and revert recent non-essential changes to `content.js`
   - Focus particularly on `valueInFriendlyUnits` function

4. Documentation:
   - Add clear documentation to the files explaining their archival status
   - Update project README.md to mention the archived files (if appropriate)

## Success Criteria
- Legacy V2 files are moved to a dedicated archive directory
- Unnecessary functional changes are reverted
- Files are clearly documented as historical reference only

## Additional Benefits
- Reduces confusion for new contributors
- Prevents unnecessary maintenance of legacy code
- Creates a clear separation between active and archived code