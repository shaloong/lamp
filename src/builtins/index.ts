// ============================================================
// Built-in Plugins — Registry
// Import all built-in plugins here to register them with PluginHost.
// ============================================================

import { pluginHost } from '../plugins/index';

// ── Core Toolbar ──────────────────────────────────────────────
import coreToolbarPlugin from './core-toolbar/index';
pluginHost.registerBuiltin(coreToolbarPlugin.manifest.id, coreToolbarPlugin);

// ── AI Actions ────────────────────────────────────────────────
import aiActionsPlugin from './ai-actions/index';
import { messages as aiMessages } from './ai-actions/messages';
pluginHost.registerBuiltin(aiActionsPlugin.manifest.id, aiActionsPlugin);

// ── Writing Stats ─────────────────────────────────────────────
import writingStatsPlugin from './writing-stats/index';
import { messages as statsMessages } from './writing-stats/messages';
pluginHost.registerBuiltin(writingStatsPlugin.manifest.id, writingStatsPlugin);

// Collect and register built-in locale messages BEFORE Vue mounts.
function registerPlugin(pluginId: string, nsPrefix: string, messages: Record<string, Record<string, unknown>>) {
  for (const [locale, flatMsgs] of Object.entries(messages)) {
    const stripped: Record<string, unknown> = {};
    for (const [fullKey, value] of Object.entries(flatMsgs)) {
      if (fullKey.startsWith(nsPrefix)) {
        stripped[fullKey.slice(nsPrefix.length)] = value;
      }
    }
    pluginHost.i18nService.addBuiltinMessages(pluginId, locale, stripped);
  }
}

registerPlugin(aiActionsPlugin.manifest.id, 'plugins.lamp-ai-actions.', aiMessages as any);
registerPlugin(writingStatsPlugin.manifest.id, 'plugins.lamp-writing-stats.', statsMessages as any);
