# Kiro IDE Constellation - Debug Guide

## Current Status: No Logs Appearing

If you're not seeing ANY logs at all, the extension isn't being loaded by Kiro. I've created a minimal test version to isolate the issue.

## Changes Made for Debugging

I've added comprehensive logging throughout the extension to help identify where the initialization might be failing in Kiro. Here's what was added:

### 1. Extension Activation Logging
- Added detailed logging in `src/extension.ts` to track activation progress
- Logs extension URI, path, and each registration step
- Catches and logs any errors during activation

### 2. Package.json Changes
- Added `"onStartupFinished"` to `activationEvents` array
- This ensures the extension activates when Kiro starts up

### 3. Sidebar Provider Logging
- Added logging in `src/ui-providers/sidebar/index.ts` for registration
- Added logging in `src/ui-providers/sidebar/sidebar.provider.ts` for webview resolution
- Tracks HTML generation and asset loading

### 4. Asset Manifest Logging
- Added detailed logging in `src/ui-providers/asset-manifest.ts`
- Tracks manifest loading, fallback paths, and asset resolution

### 5. Message Bus Logging
- Added logging in `src/services/messageBus.ts` for webview registration
- Added logging in `src/shared/utils/event-bus-register.utils.ts`
- Added logging in `web/src/services/messageBus.ts` for webview-side events

### 6. Web Component Logging
- Added logging in `web/src/main-sidebar.tsx` and `web/src/main-dashboard.tsx`
- Added logging in `web/src/views/Sidebar/Sidebar.tsx`

## How to Debug

1. **Build the extension**: Run `npm run compile`
2. **Open in Kiro debug mode**: Launch the extension in Kiro's debug environment
3. **Check the console**: Look for `[KIRO-CONSTELLATION]` prefixed log messages
4. **Identify the failure point**: The logs will show exactly where initialization stops

## Expected Log Flow

If everything works correctly, you should see logs in this order:

1. `[KIRO-CONSTELLATION] Extension activation started`
2. `[KIRO-CONSTELLATION] Registering sidebar views...`
3. `[KIRO-CONSTELLATION] Creating sidebar provider...`
4. `[KIRO-CONSTELLATION] Sidebar provider created successfully`
5. `[KIRO-CONSTELLATION] Webview view provider registered`
6. `[KIRO-CONSTELLATION] Sidebar views registered successfully`
7. `[KIRO-CONSTELLATION] Registering health dashboard...`
8. `[KIRO-CONSTELLATION] Health dashboard command registered successfully`
9. `[KIRO-CONSTELLATION] Setting up message bus handlers...`
10. `[KIRO-CONSTELLATION] Extension activation completed successfully`

When the sidebar is opened:
11. `[KIRO-CONSTELLATION] resolveWebviewView called for sidebar`
12. `[KIRO-CONSTELLATION] Loading manifest...`
13. `[KIRO-CONSTELLATION] Getting entry URIs for sidebar...`
14. `[KIRO-CONSTELLATION] Sidebar main script loaded`
15. `[KIRO-CONSTELLATION] Rendering Sidebar component`

## Common Issues to Look For

- **Missing activation events**: Fixed by adding `onStartupFinished`
- **Asset loading failures**: Check manifest loading and fallback paths
- **Webview registration failures**: Check if the view type matches package.json
- **Script loading failures**: Check if built files exist in `out/` directory
- **Component rendering failures**: Check if web components load and render

## Next Steps

Run the extension in Kiro debug mode and check where the log messages stop. This will pinpoint exactly where the initialization is failing.
## Trou
bleshooting: No Logs at All

If you don't see any `[KIRO-CONSTELLATION]` logs, the extension isn't loading. I've created a minimal test version:

### Current Configuration
- **Main entry**: Changed to `./out/extension-minimal.js` (minimal test version)
- **Activation events**: Changed to `"*"` (activate on any event)
- **VS Code engine**: Lowered to `^1.60.0` for broader compatibility

### Steps to Debug Extension Loading

1. **Run the minimal version**: 
   ```bash
   npm run debug
   ```

2. **Check for the minimal log**: Look for `[KIRO-CONSTELLATION-MINIMAL] Module loaded`
   - If you see this: The extension loads but the main code has issues
   - If you don't see this: Kiro isn't loading the extension at all

3. **If Kiro isn't loading the extension**:
   - Check if the extension appears in Kiro's extension list
   - Verify the extension is installed in the correct directory
   - Check if Kiro has specific extension requirements
   - Try installing the extension via Kiro's extension manager

4. **Test the command**: Try running "Kiro: Test Extension" from the command palette
   - If it works: Extension is loaded but webviews might have issues
   - If it doesn't appear: Extension isn't registered properly

### Reverting to Full Version

Once you confirm the minimal version works, switch back to the full version:

```json
"main": "./out/extension.js"
```

Then run `npm run compile` and test again.

## Kiro-Specific Considerations

Kiro might have different requirements than VS Code:
- Different extension loading mechanism
- Different webview implementation
- Different activation event handling
- Specific security or sandboxing restrictions