const { z } = require("zod");

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().nonnegative(),
});

describe("Zod schema validation", () => {
  it("should validate user data correctly", () => {
    const userData = {
      name: "John Doe",
      email: "john.doe@example.com",
      age: 30,
    };

    expect(() => userSchema.parse(userData)).not.toThrow();
  });

  it("should fail validation for invalid data", () => {
    const invalidUserData = {
      name: "John Doe",
      email: "john.doe@example",
      age: -1,
    };

    expect(() => userSchema.parse(invalidUserData)).toThrow();
  });
});
