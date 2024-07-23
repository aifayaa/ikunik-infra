import { CrowdaaError } from './httpResponses/CrowdaaError';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from './httpResponses/errorCodes';

export function getEnvironmentVariable(variableName: string) {
  const environmentVariable = process.env[variableName];
  if (!environmentVariable) {
    throw new CrowdaaError(
      ERROR_TYPE_SETUP,
      MISSING_ENVIRONMENT_VARIABLE_CODE,
      `Missing environment variable ${variableName}: ${environmentVariable}`
    );
  }
  return environmentVariable;
}
