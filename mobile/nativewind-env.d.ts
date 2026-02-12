/// <reference types="nativewind/types" />

// This file provides TypeScript types for NativeWind className prop
// It must be included in tsconfig.json's "include" array

// Allow CSS imports
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
