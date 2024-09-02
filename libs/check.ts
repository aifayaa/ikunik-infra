import { CrowdaaError } from './httpResponses/CrowdaaError';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from './httpResponses/errorCodes';

export function getEnvironmentVariable(
  variableName: string,
  options?: { dontThrow?: boolean }
): string {
  const environmentVariable = process.env[variableName];
  if (!options?.dontThrow && !environmentVariable) {
    throw new CrowdaaError(
      ERROR_TYPE_SETUP,
      MISSING_ENVIRONMENT_VARIABLE_CODE,
      `Missing environment variable ${variableName}: ${environmentVariable}`
    );
  }
  return environmentVariable!;
}

export function isDefined(value: unknown): value is NonNullable<typeof value> {
  return value !== undefined && value !== null;
}
