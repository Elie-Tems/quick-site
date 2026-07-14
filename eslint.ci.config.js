import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// CI "crash gate": the rules that catch code that CRASHES at runtime - an undefined
// identifier/component used as a value (the StepTemplate / missing-import class),
// const reassignment, duplicate function args, bad hooks. Kept GREEN on today's code so
// it can BLOCK a deploy the moment such a bug lands. The full lint (eslint.config.js)
// also flags stylistic issues with many pre-existing violations and isn't a hard gate.
//
// no-undef false-positives on TS *type* names (DOM lib types eslint can't see); those
// are declared as globals below. Real VALUE references (components/vars) are still caught.
const domTypes = {
  SpeechRecognition: "readonly", webkitSpeechRecognition: "readonly",
  SpeechRecognitionResultList: "readonly", SpeechRecognitionEvent: "readonly",
  SpeechRecognitionErrorEvent: "readonly", PermissionName: "readonly",
  PermissionState: "readonly", GeolocationPosition: "readonly",
};

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**", "**/*.config.*"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, React: "readonly", JSX: "readonly", NodeJS: "readonly", ...domTypes },
    },
    plugins: { "react-hooks": reactHooks, "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-undef": "error",
      "no-const-assign": "error",
      "no-dupe-args": "error",
      "no-func-assign": "error",
      "no-obj-calls": "error",
      "no-unsafe-negation": "error",
      "valid-typeof": "error",
      "react-hooks/rules-of-hooks": "error",
      "no-dupe-keys": "warn",
    },
  },
);
