/**
 * 搜索状态管理 Store
 * 管理搜索/替换对话框的状态和搜索结果
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSearchStore = defineStore('search', () => {
  // 状态
  const isOpen = ref(false);
  const mode = ref('document'); // 'document' | 'workspace'
  const query = ref('');
  const replaceText = ref('');
  const options = ref({
    caseSensitive: false,
    wholeWord: false,
  });

  // 工作区搜索结果
  const workspaceResults = ref([]);
  const isSearching = ref(false);
  const searchError = ref('');
  const refreshNonce = ref(0);
  const forceShowReplace = ref(false);
  const documentTotalMatches = ref(0);
  const documentCurrentMatch = ref(0);

  // 计算属性
  const totalMatchCount = computed(() => {
    return workspaceResults.value.reduce((sum, file) => sum + file.matches.length, 0);
  });

  const hasResults = computed(() => {
    return workspaceResults.value.length > 0;
  });

  // 方法
  function open(opts = {}) {
    isOpen.value = true;
    if (opts.mode) mode.value = opts.mode;
    if (opts.query !== undefined) query.value = opts.query;
    if (opts.replaceText !== undefined) replaceText.value = opts.replaceText;
    forceShowReplace.value = !!opts.forceShowReplace;
  }

  function close() {
    isOpen.value = false;
    forceShowReplace.value = false;
    documentTotalMatches.value = 0;
    documentCurrentMatch.value = 0;
  }

  function setMode(newMode) {
    mode.value = newMode;
  }

  function setQuery(q) {
    query.value = q;
  }

  function setReplaceText(text) {
    replaceText.value = text;
  }

  function setOptions(nextOptions = {}) {
    options.value = {
      ...options.value,
      ...nextOptions,
    };
  }

  function toggleCaseSensitive() {
    options.value.caseSensitive = !options.value.caseSensitive;
  }

  function toggleWholeWord() {
    options.value.wholeWord = !options.value.wholeWord;
  }

  function setWorkspaceResults(results) {
    workspaceResults.value = results || [];
  }

  function setSearching(searching) {
    isSearching.value = searching;
  }

  function setSearchError(error) {
    searchError.value = error;
  }

  function clearResults() {
    workspaceResults.value = [];
    searchError.value = '';
  }

  function clear() {
    query.value = '';
    replaceText.value = '';
    workspaceResults.value = [];
    searchError.value = '';
    isSearching.value = false;
  }

  function requestRefresh() {
    refreshNonce.value += 1;
  }

  function setDocumentMatchState(total, current) {
    documentTotalMatches.value = Number(total) || 0;
    documentCurrentMatch.value = Number(current) || 0;
  }

  return {
    isOpen,
    mode,
    query,
    replaceText,
    options,
    workspaceResults,
    isSearching,
    searchError,
    refreshNonce,
    forceShowReplace,
    documentTotalMatches,
    documentCurrentMatch,
    totalMatchCount,
    hasResults,
    open,
    close,
    setMode,
    setQuery,
    setReplaceText,
    setOptions,
    toggleCaseSensitive,
    toggleWholeWord,
    setWorkspaceResults,
    setSearching,
    setSearchError,
    clearResults,
    clear,
    requestRefresh,
    setDocumentMatchState,
  };
});
