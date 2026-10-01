/** Minimal shape for the `google.accounts.id` global the GSI script
 * (https://accounts.google.com/gsi/client) attaches to `window` - there's
 * no official @types package for this, and the full API surface is much
 * larger than what this app actually calls. Only the fields/methods
 * google-sign-in-button.tsx uses are declared. */
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce?: string;
            hd?: string;
            ux_mode?: "popup" | "redirect";
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black" | "outline_dark";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: string;
            }
          ): void;
        };
      };
    };
  }
}
