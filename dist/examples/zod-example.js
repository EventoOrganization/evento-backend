"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// examples/zod-example.ts
const zod_1 = require("zod");
// Define a schema
const userSchema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    age: zod_1.z.number().int().nonnegative(),
});
// Example data
const userData = {
    name: "John Doe",
    email: "john.doe@example.com",
    age: 30,
};
try {
    // Validate data
    userSchema.parse(userData);
    console.log("User data is valid");
}
catch (e) {
    if (e instanceof zod_1.ZodError) {
        console.error("Validation failed:", e.errors);
    }
    else {
        console.error("Unexpected error:", e);
    }
}
