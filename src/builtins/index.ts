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
pluginHost.registerBuiltin(aiActionsPlugin.manifest.id, aiActionsPlugin);

// ── Writing Stats ─────────────────────────────────────────────
import writingStatsPlugin from './writing-stats/index';
pluginHost.registerBuiltin(writingStatsPlugin.manifest.id, writingStatsPlugin);
