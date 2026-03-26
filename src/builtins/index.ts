// ============================================================
// Built-in Plugins — Registry
// Import all built-in plugins here to register them with PluginHost.
// ============================================================

import { pluginHost } from '../plugins/index';
import aiActionsPlugin, { messages as aiMessages } from './ai-actions/index';
import coreToolbarPlugin, { messages as coreToolbarMessages } from './core-toolbar/index';

pluginHost.registerBuiltin(aiActionsPlugin.manifest.id, aiActionsPlugin);
pluginHost.registerBuiltin(coreToolbarPlugin.manifest.id, coreToolbarPlugin);

// Collect and register built-in locale messages BEFORE Vue mounts.
// This lets each plugin own its translations independently.
for (const [locale, msgs] of Object.entries(aiMessages)) {
  pluginHost.i18nService.addBuiltinMessages(aiActionsPlugin.manifest.id, locale, msgs);
}
for (const [locale, msgs] of Object.entries(coreToolbarMessages)) {
  pluginHost.i18nService.addBuiltinMessages(coreToolbarPlugin.manifest.id, locale, msgs);
}
