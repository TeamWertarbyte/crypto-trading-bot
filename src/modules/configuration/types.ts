export interface EMAShortLong {
  s: number;
  l: number;
}

export interface EMAShortLongOverride extends EMAShortLong {
  coins: string[];
}

export type EMAConfiguration = {
  default: EMAShortLong;
  override?: EMAShortLongOverride[];
};
