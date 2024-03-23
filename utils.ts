import { humanId } from "human-id";
/**
 * Generate a human-readable unique identifier
 * Eg. all-zebras-eat
 */
export const uid = () => humanId({ capitalize: false, separator: "-" });
