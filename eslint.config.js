import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      /* On, because an unused import or binding is almost always the residue
         of a change that was not finished. `_` opts out for the cases where a
         name documents a signature it does not use. */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      /* Invented figures must not reach a live screen.
       *
       * `seeded` is the pseudo-random every fabricated dataset was built on.
       * A user panel once showed "0 recordings" and "5.7 hours contributed"
       * on the same screen because both came out of it.
       *
       * It still has two honest uses — demo mode and test fixtures — so it
       * stays, but only where those live. Anywhere else, an import of it is
       * a figure somebody is about to believe. */
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              /* `src/test` holds the generated rows the suite renders
                 against. Nothing that ships may read them.

                 This rule is the whole reason they live there. Admin screens
                 used to fall back to a seeded year of users, recordings and
                 payments whenever a request failed, and the intern charts
                 drew a fixture on a live page. A figure nobody measured,
                 shown to somebody who will act on it, is worse than an empty
                 chart — so an empty chart is what they get. */
              group: ["@/test/*", "**/test/adminFixtures", "**/test/apiUserFixtures"],
              message:
                "Generated fixtures are for tests. A screen with no data shows zeroes, never a sample.",
            },
          ],
        },
      ],
    },
  },
  {
    /* The one place a fixture is honest: a test. */
    files: ["**/__tests__/**", "src/test/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: { "no-restricted-imports": "off" },
  }
);
