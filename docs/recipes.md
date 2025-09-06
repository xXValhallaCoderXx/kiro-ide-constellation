# Recipes

## Show a VS Code toast from a webview

- Webview emits an event:

```ts
messageBus.emit(events.UiEmitToast, { text: "Hello from UI" });
```

- Extension listens globally (in `activate`):

```ts
context.subscriptions.push(
  messageBus.on(Events.UiEmitToast, async (e) => {
    await vscode.window.showInformationMessage(e.payload?.text ?? "Hello");
  })
);
```

## Open a panel from a webview, with provenance

- Webview emits request to open:

```ts
messageBus.emit(events.OpenDashboard, undefined);
```

- Extension opens and broadcasts provenance:

```ts
context.subscriptions.push(
  messageBus.on(Events.OpenDashboard, async () => {
    showHealthDashboard(context);
    await messageBus.broadcast({
      type: Events.DashboardOpened,
      payload: { via: "other" },
    });
  })
);
```

- Command palette path:

```ts
vscode.commands.registerCommand(OPEN_DASHBOARD_COMMAND, async () => {
  showHealthDashboard(context);
  await messageBus.broadcast({
    type: Events.DashboardOpened,
    payload: { via: "commandPalette" },
  });
});
```

## Keep UI hints in sync with panel lifecycle

- On panel dispose:

```ts
currentPanel.onDidDispose(() => {
  void messageBus.broadcast({
    type: Events.DashboardClosed,
    payload: undefined,
  });
});
```

- Sidebar listens:

```ts
messageBus.on(events.DashboardOpened, (e) => {
  setHint(e.payload?.via === "commandPalette");
});
messageBus.on(events.DashboardClosed, () => {
  setHint(false);
});
```
