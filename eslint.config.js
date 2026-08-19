import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"]
  },
  {
    rules: {
      // Schema libraries need `any` for arbitrary inputs and internal type gymnastics
      "@typescript-eslint/no-explicit-any": "off",

      // Allow unused vars/args when prefixed with an underscore (e.g., _ctx, _val)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],

      // Disable or warn on caught error re-throws
      "preserve-caught-error": "off"
    }
  },
  {
    // Extra leniency specifically for test files
    files: ["tests/**/*.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off"
    }
  }
);