/**
 * `<ViewTransition>` ships in the React build the App Router actually runs
 * (next/dist/compiled/react), but `@types/react` for the installed stable
 * release does not declare it yet. This augmentation types the subset the app
 * uses — the crossfade wrapper in app/layout.tsx — rather than casting it to
 * `any` at the call site.
 *
 * Delete this file once @types/react declares ViewTransition.
 */
import 'react';

declare module 'react' {
  interface ViewTransitionProps {
    children?: React.ReactNode;
    /** Shared-element identity across routes. */
    name?: string;
    /** Class (or per-transition-type map) applied to the enter animation. */
    enter?: string | Record<string, string>;
    exit?: string | Record<string, string>;
    share?: string | Record<string, string>;
    update?: string | Record<string, string>;
    default?: string | Record<string, string>;
  }

  export const ViewTransition: React.FC<ViewTransitionProps>;
}
