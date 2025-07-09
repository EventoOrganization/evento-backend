"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Safely retrieves an environment variable.
 * @param key The environment variable key to retrieve
 * @param options.throwIfMissing If true, throws an error when the variable is undefined (default: true)
 * @returns The environment variable value
 */
const getEnv = (key, options = { throwIfMissing: true }) => {
    const value = process.env[key];
    if (!value && options.throwIfMissing) {
        throw new Error(`❌ Environment variable "${key}" is not defined`);
    }
    return value;
};
exports.getEnv = getEnv;
