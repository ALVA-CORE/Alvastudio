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
              group: ["**/data/admin/demo", "**/data/annotators/demoTranscript"],
              message:
                "Demo fixtures are for demo mode only. Gate on `forceDemo` in a hook instead of importing them into a component.",
            },
          ],
        },
      ],
    },
  },
  {
    /* The two places a fixture is honest: a hook that gates on `forceDemo`
       before reaching for one, and a test. Components and pages have no
       business importing them at all, which is what the rule above is for. */
    files: ["src/hooks/**", "**/__tests__/**", "src/test/**"],
    rules: { "no-restricted-imports": "off" },
  }
);
