// Client-side application of the shared SEO registry on SPA navigation.
// The Express server injects the same tags into the initial HTML (see
// shared/seo.ts injectMeta); this keeps the tab title, canonical, OG, and
// JSON-LD correct as wouter swaps routes without a full reload.
import { useEffect } from "react";
import { getPageMeta, canonicalUrl, SITE } from "@shared/seo";

function metaByName(name: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return el;
}

function metaByProp(prop: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", prop);
    document.head.appendChild(el);
  }
  return el;
}

function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setRobots(noindex: boolean | undefined): void {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (noindex) {
    (existing ?? metaByName("robots")).setAttribute("content", "noindex, follow");
  } else if (existing) {
    existing.remove();
  }
}

function setJsonLd(objects: Record<string, unknown>[]): void {
  document.head.querySelectorAll("script[data-seo-jsonld]").forEach((n) => n.remove());
  for (const obj of objects) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-seo-jsonld", "");
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
}

/** Apply the registry's meta for `path` to the live DOM head. */
export function applyPageMeta(path: string): void {
  const meta = getPageMeta(path);
  const canonical = canonicalUrl(meta.path);
  const ogTitle = meta.ogTitle ?? meta.title;
  const ogDesc = meta.ogDescription ?? meta.description;
  const ogImage = meta.ogImage ?? SITE.defaultOgImage;

  document.title = meta.title;
  metaByName("description").setAttribute("content", meta.description);
  setCanonical(canonical);
  metaByProp("og:title").setAttribute("content", ogTitle);
  metaByProp("og:description").setAttribute("content", ogDesc);
  metaByProp("og:url").setAttribute("content", canonical);
  metaByProp("og:image").setAttribute("content", ogImage);
  metaByName("twitter:title").setAttribute("content", ogTitle);
  metaByName("twitter:description").setAttribute("content", ogDesc);
  metaByName("twitter:image").setAttribute("content", ogImage);
  setRobots(meta.noindex);
  setJsonLd(meta.jsonLd ?? []);
}

/** Hook form — apply on `path` change. */
export function usePageMeta(path: string): void {
  useEffect(() => {
    applyPageMeta(path);
  }, [path]);
}
