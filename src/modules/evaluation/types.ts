import { BittrexApi } from '../api';
import Configuration from '../configuration/Configuration';
import { Balance, MarketDecision } from '../api/types';

export interface EvaluationInterface {
  api: BittrexApi;
  config: Configuration;
  evaluate: (
    marketSymbol: string,
    balance?: Balance
  ) => Promise<MarketDecision>;
}
