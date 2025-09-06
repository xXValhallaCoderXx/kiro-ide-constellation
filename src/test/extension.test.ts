import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { SidebarViewProvider } from '../ui/sidebar/sidebarViewProvider';
import { HealthDashboardPanel } from '../ui/health-dashboard/healthDashboardPanel';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('SidebarViewProvider should have correct viewType', () => {
		assert.strictEqual(SidebarViewProvider.viewType, 'kiroConstellation.sidebar');
	});

	test('HealthDashboardPanel should have correct viewType', () => {
		assert.strictEqual(HealthDashboardPanel.viewType, 'kiroConstellation.healthDashboard');
	});

	test('SidebarViewProvider should create instance', () => {
		const mockContext = {} as vscode.ExtensionContext;
		const provider = new SidebarViewProvider(mockContext);
		assert.ok(provider);
	});
});
