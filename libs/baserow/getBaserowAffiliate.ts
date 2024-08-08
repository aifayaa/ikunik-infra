import axios from 'axios';
import { BaserowAffiliate, BaserowPaginatedResponse } from './types';

type BaserowGetAffiliateResponse = BaserowPaginatedResponse<BaserowAffiliate>;

export async function getBaserowAffiliate(
  affiliateCode: string
): Promise<BaserowAffiliate | null> {
  const res = await axios.get<BaserowGetAffiliateResponse>(
    `${process.env.BASEROW_URL}/api/database/rows/table/500/`,
    {
      headers: {
        Authorization: `Token ${process.env.BASEROW_API_ACCESS_TOKEN}`,
      },
      params: {
        filter__field_4601__equal: affiliateCode,
      },
    }
  );

  // We should always has one result for a given affiliateCode
  if (res.data.results.length > 1) {
    // TODO use appropriate logger
    console.warn('Found multiple baserow affiliates, using first one found.', {
      affiliateCode: affiliateCode,
      results: res.data.results,
    });
  }

  return res.data.results[0];
}
