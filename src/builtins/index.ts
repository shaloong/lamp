// ============================================================
// Built-in Plugins — Registry
// Import all built-in plugins here to register them with PluginHost.
// ============================================================

import { pluginHost } from '../plugins/index';
import aiActionsPlugin from './ai-actions/index';
import coreToolbarPlugin from './core-toolbar/index';
import { messages as pluginMessages } from './ai-actions/messages';

pluginHost.registerBuiltin(aiActionsPlugin.manifest.id, aiActionsPlugin);
pluginHost.registerBuiltin(coreToolbarPlugin.manifest.id, coreToolbarPlugin);

// Collect and register built-in locale messages BEFORE Vue mounts.
// pluginMessages contains keys with the full namespace prefix baked in
// (e.g. 'plugins.lamp-ai-actions.name', 'plugins.lamp-core-toolbar.bold').
// addBuiltinMessages expects keys WITHOUT the namespace prefix.
// We strip the ns prefix per-plugin so the storage key ends up correct:
//   input key: 'plugins.lamp-ai-actions.name'
//   stripped:  'name'
//   storage:   'plugins.lamp-ai-actions.name'  ✓
function registerPlugin(pluginId, nsPrefix) {
  for (const [locale, flatMsgs] of Object.entries(pluginMessages)) {
    const stripped = {};
    for (const [fullKey, value] of Object.entries(flatMsgs)) {
      if (fullKey.startsWith(nsPrefix)) {
        stripped[fullKey.slice(nsPrefix.length)] = value;
      }
    }
    pluginHost.i18nService.addBuiltinMessages(pluginId, locale, stripped);
  }
}

registerPlugin(aiActionsPlugin.manifest.id, 'plugins.lamp-ai-actions.');
registerPlugin(coreToolbarPlugin.manifest.id, 'plugins.lamp-core-toolbar.');
