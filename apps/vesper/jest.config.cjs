/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleNameMapper: {
    "^@vesper-counsel/shell$": "<rootDir>/../../packages/shell/src/index.ts",
  },
  setupFiles: ["<rootDir>/test/setup-env.cjs"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          strict: true,
          noUncheckedIndexedAccess: true,
          module: "commonjs",
          moduleResolution: "node",
          types: ["jest", "node"],
          isolatedModules: true,
        },
      },
    ],
  },
};
