export type BaserowPaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type BaserowAffiliate = {
  id: string;
  order: string;
  /**
   * "Affiliate Code"
   */
  field_4601: string | null;
  /**
   * "Fees"
   */
  field_4602: string | null;
  /**
   * "Stripe Account ID"
   */
  field_4637: string | null;
};
