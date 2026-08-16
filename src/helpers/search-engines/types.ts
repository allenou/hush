export interface SearchResultSelectorRule {
  containerSelector: string;
  itemSelector: string;
  linkSelector: string;
  minimumItems?: number;
}

export interface SearchEngineRule {
  name: string;
  hostname: string;
  aliases?: readonly string[];
  linkSelector: string;
  queryParameterNames: readonly string[];
  buildSearchUrl: (query: string) => string;
  resultSelectors: readonly SearchResultSelectorRule[];
  adItemSelectors?: readonly string[];
  isAdItem?: (item: Element) => boolean;
  findAdContainers?: (root: ParentNode) => Element[];
}
