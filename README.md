# Hydrogen Example: Shopify Inbox chat widget

This example demonstrates how to integrate the Shopify Inbox chat widget
with Hydrogen. The process is currently a little cumbersome because we don't
readily expose the Shopify Inbox chat shop ID in the Admin UI.

<img width="308" alt="Screenshot 2023-09-07 at 10 36 58 AM" src="https://github.com/Shopify/hydrogen/assets/12080141/825f4f5c-bea2-43c2-ac8c-9cbfe6c8555d">

## 1. Find your Shopify Inbox shop id

1. Install the [Shopify Inbox](https://apps.shopify.com/inbox?show_store_picker=1)
   app into your store
2. Make sure it is `enabled` in your `Online Store` channel by going to the app settings.
   [TODO] Insert image here
3. Visit your `published liquid theme` preview and inspect the DOM via your browser
   DevTools
4. Search the DOM for a script tag with a src pointing to a `shopifyChatV1.js`
   <img width="793" alt="Screenshot 2023-09-07 at 10 23 53 AM" src="https://github.com/Shopify/hydrogen/assets/12080141/f74aa33c-eb71-4521-8a11-f2b2776bb1b4">
5. Copy the `shop_id` parameter found in the `src` url
6. Add the shop_id to your `.env` file and Hydrogen storefront environment variables
   as `PUBLIC_SHOPIFY_INBOX_SHOP_ID`

## 2. Add the required utilities `getPublicEnv` and `useEnv`

```ts
// filename: app/utils.tsx (or preffered destination)

// Filters out public environment variables to prevent private ones from being sent
// to the browser
export function getPublicEnv(env: Env): PublicEnv {
  if (typeof env !== 'object') {
    return null;
  }

  const defaultPublicEnv = {} as PublicEnv;

  const publicEnv = Object.keys(env).reduce((acc, key) => {
    if (acc && key.startsWith('PUBLIC_')) {
      const envKey = key as keyof PublicEnv;
      const envValue = env[envKey];
      acc[envKey] = envValue;
    }
    return acc;
  }, defaultPublicEnv);

  if (publicEnv && Object.keys(publicEnv).length === 0) {
    return null;
  }

  return publicEnv;
}

// Returns the public environment variables anywhere in your app
export function useEnv(key: string = 'publicEnv'): PublicEnv | {} {
  const [root] = useMatches();
  return root?.data?.[key] ?? {};
}
```

## 3. Add `ShopifyInbox` component

Create the following component:

```ts
// filename: app/components/ShopifyInbox.tsx
import {Script} from '@shopify/hydrogen';

export type ShopifyInboxProps = {
  env?: 'production' | 'development';
  button?: {
    color?: string;
    style?: 'icon' | 'text';
    horizontalPosition?: 'button_left' | 'button_right';
    verticalPosition?: 'lowest' | 'higher' | 'highest';
    /* Chat Button Text */
    text?:
      | 'chat_with_us'
      | 'assistance'
      | 'contact'
      | 'help'
      | 'support'
      | 'live_chat'
      | 'message_us'
      | 'need_help'
      | 'no_text';
    icon?:
      | 'chat_bubble'
      | 'agent'
      | 'speech_bubble'
      | 'text_message'
      | 'email'
      | 'hand_wave'
      | 'lifebuoy'
      | 'paper_plane'
      | 'service_bell'
      | 'smiley_face'
      | 'question_mark'
      | 'team'
      | 'no_icon';
  };
  shop: {
    domain: string;
    id: string;
  };
  version?: 'V1';
};

export function ShopifyInbox({
  button,
  shop,
  env = 'production',
  version = 'V1',
}: ShopifyInboxProps) {
  if (!shop?.domain || !shop?.id) {
    // eslint-disable-next-line no-console
    console.error(
      'ShopifyInbox: shop domain and id are required. You can get these values from the app settings.',
    );
    return null;
  }

  const defaultButton = {
    color: 'black',
    style: 'icon',
    horizontalPosition: 'button_right',
    verticalPosition: 'lowest',
    text: 'chat_with_us',
    icon: 'chat_bubble',
  } as NonNullable<ShopifyInboxProps['button']>;

  const buttonKeyMap = {
    color: 'c',
    style: 's',
    horizontalPosition: 'p',
    verticalPosition: 'vp',
    text: 't',
    icon: 'i',
  };

  if (typeof button === 'undefined') {
    button = defaultButton;
  }

  // create the button search params based on the button object props
  const buttonParams = Object.keys(button).reduce((acc, key) => {
    const value = button?.[key as keyof typeof button];

    if (typeof value !== 'undefined') {
      const paramKey = buttonKeyMap[key as keyof typeof buttonKeyMap];
      acc[paramKey] = value;
    } else {
      const defaultValue = defaultButton?.[key as keyof typeof defaultButton];
      if (!defaultValue) return acc;
      const paramKey = buttonKeyMap[key as keyof typeof buttonKeyMap];
      acc[paramKey] = defaultValue;
    }
    return acc;
  }, {} as Record<string, string>);

  const baseUrl = `https://cdn.shopify.com/shopifycloud/shopify_chat/storefront/shopifyChat${version}.js`;
  const buttonSearch = new URLSearchParams(buttonParams).toString();

  return (
    <Script
      id="shopify-inbox"
      suppressHydrationWarning
      async={true}
      src={`${baseUrl}?v=${version}&api_env=${env}&shop_id=${shop.id}&shop=${shop.domain}&${buttonSearch}`}
    />
  );
}
```

## 4. Update Remix context `env` type (Typescript Only)

If using typescript, you will need to add `PUBLIC_SHOPIFY_INBOX_SHOP_ID` to
`remix.env.d.ts` env interface

```diff
  // filename: remix.env.d.ts
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
+   PUBLIC_SHOPIFY_INBOX_SHOP_ID: string;
  }
```

## 5. Update root.tsx to render the chat widget

### 5.1 Return `publicEnv` from the `loader`

Filter out public environment variables that we can expose to the browser

```ts
// filename: app/root.tsx
import {getPublicEnv} from '~/utils';

export async function loader({context}: LoaderArgs) {
  // ... other code
  return defer(
    {
      // ... other code
      publicEnv: getPublicEnv(context.env),
    },
    {headers},
  );
}
```

### 5.2 Access the public env variables via `useEnv`

```ts
// filename: app/root.tsx
import {useEnv} from '~/utils';

export default function App() {
  // ... other code
  const env = useEnv();
  // ... other code
}
```

### 5.3 Render the ShopifyInbox widget

```ts
// filename: app/root.tsx
export default function App() {
  // ... other code
  const env = useEnv();

  return (
    <html lang="en">
      <head>{/* ... other code */}</head>
      <body>
        {/* ... other code */}
        <ShopifyInbox
          button={{
            color: 'red',
            style: 'icon',
            horizontalPosition: 'button_right',
            verticalPosition: 'lowest',
            text: 'chat_with_us',
            icon: 'chat_bubble',
          }}
          shop={{
            domain: env.PUBLIC_STORE_DOMAIN,
            id: env.PUBLIC_SHOPIFY_INBOX_SHOP_ID,
          }}
        />
        {/* ... other code */}
      </body>
    </html>
  );
}
```

### 5.4 Update the CSP `connect-src` directive (Optional)

If using [Content Security Policy CSP](https://shopify.dev/docs/custom-storefronts/hydrogen/content-security-policy)
you will need to update the `connect-src` directive to allow the Inbox widget
script to load securely.

```ts
// filename: app/entry.server.ts

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    connectSrc: [
      "'self'",
      'cdn.shopify.com',
      'monorail-edge.shopifysvc.com',
      'shopify-chat.shopifyapps.com', // Shopify Inbox
    ],
  });

  /* ... other code */
}
```

Note: The widget won't fully work in `localhost` because it is currently not allowed by our bot protection mechanism, but it will work once it is deployed to a qualified domain.

We are hoping to improve this flow by adding a code snippet to the Inbox app settings page

---;

## Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 16.14.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```
