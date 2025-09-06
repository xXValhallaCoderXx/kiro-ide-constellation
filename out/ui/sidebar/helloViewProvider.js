"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelloViewProvider = void 0;
class HelloViewProvider {
    context;
    static viewType = 'kiroConstellation.hello';
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(webviewView, _context, _token) {
        webviewView.webview.options = {
            enableScripts: false,
        };
        webviewView.webview.html = this.getHtml();
    }
    getHtml() {
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
                <title>Kiro</title>
            </head>
            <body>
                <h3 class="hello">Hello World</h3>
            </body>
            </html>`;
    }
}
exports.HelloViewProvider = HelloViewProvider;
//# sourceMappingURL=helloViewProvider.js.map