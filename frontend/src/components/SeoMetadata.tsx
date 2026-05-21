import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://bingo.pseudolab-devfactory.com";
const SITE_NAME = "Bingo Networking";
const DEFAULT_META = {
  title: "Bingo Networking | DevFactory",
  description:
    "Bingo Networking은 행사 참가자가 키워드를 교환하며 자연스럽게 연결되는 DevFactory 이벤트 빙고 서비스입니다.",
  robots: "index, follow",
};

const PAGE_META: Record<
  string,
  { title: string; description: string; robots?: string }
> = {
  "/": DEFAULT_META,
  "/demo/play": {
    title: "Bingo Networking 데모 | DevFactory",
    description:
      "키워드 선택, 참가자 검색, 빙고 보드 완성 흐름을 직접 체험해 보는 Bingo Networking 데모입니다.",
  },
  "/privacy": {
    title: "Bingo Networking 개인정보처리방침 | DevFactory",
    description:
      "DevFactory 서비스 운영팀이 Bingo Networking 운영을 위해 처리하는 개인정보 기준을 안내합니다.",
  },
  "/terms": {
    title: "Bingo Networking 이용약관 | DevFactory",
    description:
      "Bingo Networking 서비스 이용 기준과 사용자 책임 범위를 안내합니다.",
  },
};

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

const normalizePathname = (pathname: string) =>
  pathname.replace(/\/$/, "") || "/";

const getCanonicalUrl = (pathname: string, isPublicIndexedRoute: boolean) =>
  isPublicIndexedRoute
    ? `${SITE_ORIGIN}${pathname === "/" ? "/" : pathname}`
    : `${SITE_ORIGIN}/`;

const SeoMetadata = () => {
  const location = useLocation();

  useEffect(() => {
    const pathname = normalizePathname(location.pathname);
    const isPublicIndexedRoute = Object.prototype.hasOwnProperty.call(
      PAGE_META,
      pathname,
    );
    const meta = PAGE_META[pathname] ?? {
      ...DEFAULT_META,
      robots: "noindex, nofollow",
    };
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
