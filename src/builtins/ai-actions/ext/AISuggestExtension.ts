// ============================================================
// TipTap Extension: AI Suggestion Inline Widget
// Shows the AI-generated text as a ghost widget at cursor position
// via a ProseMirror Decoration.widget.
// Accept → insert text into document.  Reject → remove widget.
// Keyboard: Tab = accept, Escape = reject.
// ============================================================

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { AISuggestion } from '../../../plugins/types';
import { pluginHost } from '../../../plugins/index';

// ─── Plugin Key ──────────────────────────────────────────────

export const aiSuggestPluginKey = new PluginKey('ai-suggestion');

// ─── Module-level state (avoids PM plugin key lookup issues) ──

let _currentSuggestion: AISuggestion | null = null;

function getSuggestion(): AISuggestion | null {
  return _currentSuggestion;
}

// ─── Extension ────────────────────────────────────────────────

export const AISuggestExtension = Extension.create({
  name: 'aiSuggest',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiSuggestPluginKey,

        state: {
          init() {
            _currentSuggestion = null;
            return {};
          },
          apply(tr): Record<string, never> {
            const meta = tr.getMeta(aiSuggestPluginKey);
            if (meta !== undefined) {
              _currentSuggestion = meta ?? null;
            } else if (tr.docChanged && _currentSuggestion) {
              _currentSuggestion = null;
            }
            return {};
          },
        },

        props: {
          decorations(state) {
            const suggestion = getSuggestion();
            if (!suggestion) return DecorationSet.empty;

            const { content, from, to, insertMode } = suggestion;
            const decos: Decoration[] = [];

            // Replace mode: style the original text as "to be replaced"
            if (insertMode === 'replace' && from >= 0 && to <= state.doc.content.size) {
              decos.push(
                Decoration.inline(from, to, {
                  class: 'ai-suggest-replace',
                })
              );
            }

            // Ghost text as a widget — content set via JS, primary color via CSS var
            decos.push(
              Decoration.widget(to, buildGhostWidget(content), {
                side: 1,
                key: 'ai-suggestion-widget',
              })
            );

            return DecorationSet.create(state.doc, decos);
          },
        },

        appendTransaction(transactions, _oldState, newState) {
          if (!getSuggestion()) return null;
          for (const tr of transactions) {
            if (tr.docChanged) {
              const dismissTr = newState.tr.setMeta(aiSuggestPluginKey, null);
              return dismissTr;
            }
          }
          return null;
        },
      }),
    ];
  },

  addCommands() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      setAISuggestion:
        (suggestion: AISuggestion | null) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ tr, dispatch }: any) => {
          if (dispatch) {
            tr.setMeta(aiSuggestPluginKey, suggestion ?? null);
            dispatch(tr);
          }
          return true;
        },

      /** Accept: insert the suggestion text into the document */
      acceptAISuggestion:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ tr, dispatch }: any) => {
          const suggestion = getSuggestion();
          if (!suggestion || !dispatch) return false;

          const { content, insertMode, from, to } = suggestion;

          // Clear Vue state first so toolbar disappears immediately
          pluginHost.aiState.suggestion = null;
          tr.setMeta(aiSuggestPluginKey, null);

          if (insertMode === 'replace') {
            tr.delete(from, to);
            tr.insertText(content, from);
            tr.setSelection(tr.selection.constructor.near(tr.doc.resolve(from + content.length)));
          } else {
            tr.insertText(content, to);
            tr.setSelection(tr.selection.constructor.near(tr.doc.resolve(to + content.length)));
          }

          dispatch(tr);
          return true;
        },

      /** Reject: dismiss the suggestion */
      dismissAISuggestion:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ tr, dispatch }: any) => {
          pluginHost.aiState.suggestion = null;
          if (dispatch) {
            tr.setMeta(aiSuggestPluginKey, null);
            dispatch(tr);
          }
          return true;
        },
    } as any;
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (getSuggestion()) {
          pluginHost.aiState.suggestion = null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor.commands as any).acceptAISuggestion();
          return true;
        }
        return false;
      },
      Escape: ({ editor }) => {
        if (getSuggestion()) {
          pluginHost.aiState.suggestion = null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor.commands as any).dismissAISuggestion();
          return true;
        }
        return false;
      },
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────

/** Build a DOM element for the ghost text widget */
function buildGhostWidget(content: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'ai-suggest-inline';
  span.textContent = content;
  return span;
}
