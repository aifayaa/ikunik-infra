import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  DONT_USE_THIS_CODE,
  ERROR_TYPE_UNTESTED_CODE,
} from '@libs/httpResponses/errorCodes';

export function trowExceptionUntestedCode20240808() {
  throw new CrowdaaError(
    ERROR_TYPE_UNTESTED_CODE,
    DONT_USE_THIS_CODE,
    `2024/08/08: This code is not tested`
  );
}
