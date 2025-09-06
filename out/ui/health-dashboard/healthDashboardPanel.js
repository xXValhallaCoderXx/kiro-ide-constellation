"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthDashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class HealthDashboardPanel {
    static currentPanel;
    static viewType = 'kiroConstellation.healthDashboard';
    _panel;
    _extensionUri;
    _disposables = [];
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (HealthDashboardPanel.currentPanel) {
            HealthDashboardPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(HealthDashboardPanel.viewType, 'Health Dashboard', column || vscode.ViewColumn.One, {
            // Enable javascript in the webview
            enableScripts: true,
            // And restrict the webview to only loading content from our extension's `out` directory.
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')]
        });
        HealthDashboardPanel.currentPanel = new HealthDashboardPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._updateWebview();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    dispose() {
        HealthDashboardPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _updateWebview() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }
    _getHtmlForWebview(webview) {
        const scriptPath = vscode.Uri.file(path.join(this._extensionUri.fsPath, 'out', 'webview.js'));
        const scriptUri = webview.asWebviewUri(scriptPath);
        const styles = `
            :root { color-scheme: light dark; }
            body { font-family: var(--vscode-font-family); margin: 0; padding: 12px; }
            .hello { color: var(--vscode-foreground); }
        `;
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>${styles}</style>
                <title>Health Dashboard</title>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
exports.HealthDashboardPanel = HealthDashboardPanel;
//# sourceMappingURL=healthDashboardPanel.js.map