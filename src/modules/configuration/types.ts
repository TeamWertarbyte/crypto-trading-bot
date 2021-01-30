interface ShortAndLong {
  s: number;
  l: number;
}

interface ShortAndLongOverride extends ShortAndLong {
  coins: string[];
}

export type EMAConfiguration = {
  default: ShortAndLong;
  override?: ShortAndLongOverride[];
};
