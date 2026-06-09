// ============================================================
// Built-in Plugins — Registry
// Import all built-in plugins here to register them with PluginHost.
// ============================================================

import { pluginHost } from '../plugins/index';
import aiActionsPlugin from './ai-actions/index';
import coreToolbarPlugin from './core-toolbar/index';

pluginHost.registerBuiltin(aiActionsPlugin.manifest.id, aiActionsPlugin);
pluginHost.registerBuiltin(coreToolbarPlugin.manifest.id, coreToolbarPlugin);
