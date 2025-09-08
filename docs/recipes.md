# Recipes

Keep examples short; see code for full context.

Open dashboard from webview (and mark provenance)

```ts
// webview
messageBus.emit(events.OpenDashboard, undefined);

// extension
messageBus.on(Events.OpenDashboard, async () => {
  showHealthDashboard(context);
  await messageBus.broadcast({ type: Events.DashboardOpened, payload: { via: 'other' } });
});
```

VS Code toast from webview

```ts
// webview
messageBus.emit(events.UiEmitToast, { text: 'Hello from UI' });

// extension
messageBus.on(Events.UiEmitToast, async (e) => {
  await vscode.window.showInformationMessage(e.payload?.text ?? 'Hello');
});
```

Panel lifecycle → UI hint

```ts
// extension (on panel dispose)
void messageBus.broadcast({ type: Events.DashboardClosed, payload: undefined });

// webview (sidebar)
messageBus.on(events.DashboardOpened, (e) => setHint(e.payload?.via === 'commandPalette'));
messageBus.on(events.DashboardClosed, () => setHint(false));
```
