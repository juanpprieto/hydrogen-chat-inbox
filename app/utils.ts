import {useLocation} from '@remix-run/react';
import type {SelectedOption} from '@shopify/hydrogen/storefront-api-types';
import {useMemo} from 'react';
import {useMatches} from '@remix-run/react';

export type PublicEnv = Pick<Env, `PUBLIC_${string}` & keyof Env> | null;

/**
 * Returns the public environment variables from the root route data.
 * @example
 * ```ts
 * function Header() {
 *  const env = useEnv();
 * }
 * ```
 */
export function useEnv(key: string = 'publicEnv'): PublicEnv | {} {
  const [root] = useMatches();
  return root?.data?.[key] ?? {};
}

/*
 * Returns a subset of the environment variables that are prefixed with PUBLIC_
 * @param env - The environment variables
 * @example
 * ```ts
 *  const env = {
 *    PUBLIC_API_URL: 'https://api.example.com',
 *    PRIVATE_TOKEN: '1234567890',
 *    PUBLIC_APP_NAME: 'My App',
 *  }
 *  const publicEnv = getPublicEnv(env);
 *  // -> {  PUBLIC_API_URL: 'https://api.example.com',  PUBLIC_APP_NAME: 'My App' }
 * ```
 */
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

export function useVariantUrl(
  handle: string,
  selectedOptions: SelectedOption[],
) {
  const {pathname} = useLocation();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
    });
  }, [handle, selectedOptions, pathname]);
}

export function getVariantUrl({
  handle,
  pathname,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  pathname: string;
  searchParams: URLSearchParams;
  selectedOptions: SelectedOption[];
}) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;

  const path = isLocalePathname
    ? `${match![0]}products/${handle}`
    : `/products/${handle}`;

  selectedOptions.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

  const searchString = searchParams.toString();

  return path + (searchString ? '?' + searchParams.toString() : '');
}
