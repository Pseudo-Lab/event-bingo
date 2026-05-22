import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getSeoMetaForPath,
  isIndexedSeoPath,
  normalizeSeoPathname,
  SITE_NAME,
  SITE_ORIGIN,
} from "./seoMetadataConfig";

const setMetaTag = (
  selector: string,
  attributes: Record<string, string>,
  content: string,
) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element?.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const updateCanonical = (url: string) => {
  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", url);
};

const getCanonicalUrl = (pathname: string, isPublicIndexedRoute: boolean) =>
  isPublicIndexedRoute
    ? `${SITE_ORIGIN}${pathname === "/" ? "/" : pathname}`
    : `${SITE_ORIGIN}/`;

const SeoMetadata = () => {
  const location = useLocation();

  useEffect(() => {
    const pathname = normalizeSeoPathname(location.pathname);
    const isPublicIndexedRoute = isIndexedSeoPath(pathname);
    const meta = getSeoMetaForPath(pathname);
    const canonicalUrl = getCanonicalUrl(pathname, isPublicIndexedRoute);

    document.title = meta.title;
    setMetaTag(
      'meta[name="description"]',
      { name: "description" },
      meta.description,
    );
    setMetaTag(
      'meta[name="robots"]',
      { name: "robots" },
      meta.robots ?? "index, follow",
    );
    setMetaTag(
      'meta[property="og:title"]',
      { property: "og:title" },
      meta.title,
    );
    setMetaTag(
      'meta[property="og:description"]',
      { property: "og:description" },
      meta.description,
    );
    setMetaTag('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    setMetaTag(
      'meta[property="og:site_name"]',
      { property: "og:site_name" },
      SITE_NAME,
    );
    setMetaTag(
      'meta[name="twitter:title"]',
      { name: "twitter:title" },
      meta.title,
    );
    setMetaTag(
      'meta[name="twitter:description"]',
      { name: "twitter:description" },
      meta.description,
    );
    updateCanonical(canonicalUrl);
  }, [location.pathname]);

  return null;
};

export default SeoMetadata;
