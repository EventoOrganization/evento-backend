import dotenv from "dotenv";
dotenv.config();

/**
 * Safely retrieves an environment variable.
 * @param key The environment variable key to retrieve
 * @param options.throwIfMissing If true, throws an error when the variable is undefined (default: true)
 * @returns The environment variable value
 */
export const getEnv = (
  key: string,
  options: { throwIfMissing?: boolean } = { throwIfMissing: true },
): string => {
  const value = process.env[key];
  if (!value && options.throwIfMissing) {
    throw new Error(`❌ Environment variable "${key}" is not defined`);
  }
  return value!;
};
