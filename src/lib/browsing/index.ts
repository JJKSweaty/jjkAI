// Web Browsing System - Main exports

export { browsingClassifier, BrowsingClassifier } from './classifier';
export type { BrowsingSignals } from './classifier';

export { webTools, WebTools } from './tools';
export type {
  SearchWebParams,
  SearchResult,
  FetchUrlParams,
  FetchUrlResult,
  ParsedSource,
} from './tools';

export { browsingController, BrowsingController } from './controller';
export type {
  BrowsingConfig,
  BrowsingResult,
} from './controller';

export {
  CitationFormatter,
  CitedAnswerBuilder,
  citationFormatter,
} from './citations';
export type { Source, CitedText } from './citations';

export { browsingIntegration, BrowsingIntegration } from './integration';
export type {
  BrowsingOptions,
  EnhancedMessage,
} from './integration';