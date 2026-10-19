#!/usr/bin/env python3
"""TINA-FULLCHECK: all configured collections, backend -> public SSR verification.

The gate fails when a configured collection has no explicit check. Current required scope:
blog, page, category, user, navigation, config (Global Config).
"""
from __future__ import annotations

import json
import os
import re
import time
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

import requests

SITE = os.environ.get("SITE_URL", "").rstrip("/")
if not SITE or "localhost" in SITE.lower() or "127.0.0.1" in SITE:
    raise SystemExit("TINA-FULLCHECK BLOCKED: SITE_URL must be the public HTTPS origin")
CLIENT_ID = (os.environ.get("NEXT_PUBLIC_TINA_CLIENT_ID") or os.environ.get("TINA_CLIENT_ID") or "").strip()
BRANCH = (os.environ.get("NEXT_PUBLIC_TINA_BRANCH") or os.environ.get("TINA_BRANCH") or "main").strip()
TOKEN = os.environ.get("TINA_TOKEN", "").strip()
if not CLIENT_ID or not TOKEN:
    raise SystemExit("TINA-FULLCHECK BLOCKED: Tina client ID and token are required")

TINA_URL = f"https://content.tinajs.io/2.4/content/{CLIENT_ID}/github/{BRANCH}"
REQUIRED = {"blog", "page", "category", "user", "navigation", "config"}
SEO_FIELDS = "metaTitle metaDescription ogTitle ogDescription ogImage canonicalUrl noindex nofollow"


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_head = False
        self.in_title = False
        self.titles: list[str] = []
        self._title: list[str] = []
        self.metas: list[dict[str, str | None]] = []
        self.links: list[dict[str, str | None]] = []
        self.article_categories: list[dict[str, str]] = []
        self._article_category: int | None = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "head": self.in_head = True
        elif self.in_head and tag == "title": self.in_title, self._title = True, []
        elif self.in_head and tag == "meta": self.metas.append(values)
        elif self.in_head and tag == "link": self.links.append(values)
        if tag == "a" and "data-article-category" in values:
            self.article_categories.append({"label": "", "href": str(values.get("href") or ""), "slug": str(values.get("data-category-slug") or "")})
            self._article_category = len(self.article_categories) - 1

    def handle_endtag(self, tag):
        if tag == "title" and self.in_title:
            self.titles.append("".join(self._title).strip()); self.in_title = False
        elif tag == "head": self.in_head = False
        if tag == "a" and self._article_category is not None:
            self.article_categories[self._article_category]["label"] = self.article_categories[self._article_category]["label"].strip()
            self._article_category = None

    def handle_data(self, data):
        if self.in_title: self._title.append(data)
        if self._article_category is not None: self.article_categories[self._article_category]["label"] += data


def configured_collections() -> set[str]:
    root = Path(__file__).resolve().parents[1] / "tina" / "collections"
    found = set()
    for path in root.glob("*.ts"):
        source = path.read_text(encoding="utf-8")
        anchor = re.search(r"export\s+const\s+\w+Collection\s*:\s*Collection\s*=\s*\{", source)
        match = re.search(r"\bname\s*:\s*['\"]([^'\"]+)['\"]", source[anchor.end():]) if anchor else None
        if match: found.add(match.group(1))
    return found


def query_backend() -> dict:
    query = f"""
    query AllCollectionFullcheck {{
      blog(relativePath: "editorial-independence-and-sustainability.mdx") {{ title description seo {{ {SEO_FIELDS} }} _sys {{ filename }} categories }}
      blogs: blogConnection(first: 100) {{ edges {{ node {{ title categories _sys {{ filename }} }} }} }}
      page(relativePath: "home.mdx") {{ title seo {{ {SEO_FIELDS} }} _sys {{ filename }} }}
      category(relativePath: "Business.json") {{ title description seo {{ {SEO_FIELDS} }} _sys {{ filename }} }}
      user(relativePath: "admin.json") {{ name role bio seo {{ {SEO_FIELDS} }} _sys {{ filename }} }}
      navigation(relativePath: "header.json") {{ title items {{ label href children {{ label href }} }} _sys {{ filename }} }}
      config(relativePath: "config.json") {{
        headerNavigation {{ ... on Navigation {{ _sys {{ relativePath }} }} }}
        footerNavigation {{ ... on Navigation {{ _sys {{ relativePath }} }} }}
        seo {{ title description siteOwner logo favicon footerLogo }}
        contactForm {{ heading description buttonText note subject formspreeEndpoint }}
        footer {{ ctaEyebrow ctaTitle ctaText ctaButtonText ctaButtonHref copyright legalLinks {{ label href }} }}
        notFound {{ eyebrow title description buttonText buttonHref }}
        codeInjection {{ headerCode footerCode }}
        contactLinks {{ title link icon }}
        footerStarfield
        _sys {{ filename }}
      }}
    }}
    """
    response = requests.post(TINA_URL, headers={"X-API-KEY": TOKEN, "Content-Type": "application/json", "Accept-Encoding": "identity"}, json={"query": query}, timeout=45)
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"): raise RuntimeError(json.dumps(payload["errors"], indent=2))
    return payload["data"]


def fetch_route(path: str, expected_status: int = 200) -> dict:
    response = requests.get(f"{SITE}{path}{'&' if '?' in path else '?'}tina-fullcheck={time.time_ns()}", headers={"Cache-Control": "no-cache", "Pragma": "no-cache", "User-Agent": "TINA-FULLCHECK"}, timeout=45)
    if response.status_code != expected_status:
        raise RuntimeError(f"{path}: expected HTTP {expected_status}, got {response.status_code}")
    parser = DocumentParser(); parser.feed(response.text)
    return {"status": response.status_code, "cache": response.headers.get("cf-cache-status"), "html": unescape(response.text), "head": parser}


def values(items: list[dict], key: str, name: str) -> list[str]:
    return [str(item.get("content") or "") for item in items if item.get(key) == name]


def exact_one(label: str, actual: list[str], expected: str, failures: list[str]) -> None:
    if actual != [expected]: failures.append(f"{label}: expected exactly {[expected]!r}, got {actual!r}")


def assert_text(label: str, html: str, expected: str, failures: list[str]) -> None:
    if expected and expected.casefold() not in html.casefold(): failures.append(f"{label}: backend value absent from public SSR HTML")


def assert_seo(label: str, route: dict, seo: dict | None, title_fallback: str, description_fallback: str, canonical_fallback: str, failures: list[str]) -> dict:
    seo = seo or {}
    title = seo.get("metaTitle") or title_fallback
    description = seo.get("metaDescription") or description_fallback
    social_title = seo.get("ogTitle") or title
    social_description = seo.get("ogDescription") or description
    canonical = urljoin(f"{SITE}/", seo.get("canonicalUrl") or canonical_fallback)
    robots = f"{'noindex' if seo.get('noindex') else 'index'}, {'nofollow' if seo.get('nofollow') else 'follow'}"
    head = route["head"]
    exact_one(f"{label}.title", head.titles, title, failures)
    exact_one(f"{label}.description", values(head.metas, "name", "description"), description, failures)
    exact_one(f"{label}.canonical", [str(x.get("href") or "") for x in head.links if "canonical" in str(x.get("rel") or "").split()], canonical, failures)
    exact_one(f"{label}.og:title", values(head.metas, "property", "og:title"), social_title, failures)
    exact_one(f"{label}.og:description", values(head.metas, "property", "og:description"), social_description, failures)
    exact_one(f"{label}.twitter:title[name]", values(head.metas, "name", "twitter:title"), social_title, failures)
    exact_one(f"{label}.twitter:description[name]", values(head.metas, "name", "twitter:description"), social_description, failures)
    exact_one(f"{label}.robots", values(head.metas, "name", "robots"), robots, failures)
    return {"title": title, "description": description, "canonical": canonical, "robots": robots}


def main() -> int:
    failures: list[str] = []
    configured = configured_collections()
    if configured != REQUIRED:
        failures.append(f"collection coverage mismatch: configured={sorted(configured)}, explicitly checked={sorted(REQUIRED)}")
    data = query_backend()
    for name in sorted(REQUIRED):
        if not data.get(name): failures.append(f"{name}: Tina query returned no document")

    routes = {
        "page": fetch_route("/"),
        "blog": fetch_route("/blog/editorial-independence-and-sustainability/"),
        "category": fetch_route("/business/"),
        "user": fetch_route("/author/admin/"),
        "notFound": fetch_route("/__tina_fullcheck_missing__/", 404),
    }
    config, page, blog, category, user = data["config"], data["page"], data["blog"], data["category"], data["user"]
    site_title = config.get("seo", {}).get("title") or "Herald News Today"
    business_post_count = sum(
        1 for edge in (data.get("blogs", {}).get("edges") or [])
        if any(str(value).replace("\\", "/").lower().endswith("/business.json") for value in ((edge.get("node") or {}).get("categories") or []))
    )
    category_description = category.get("description") or (
        f"Read the latest {category.get('title')} articles from Herald News Today."
        if business_post_count else
        f"Articles in the {category.get('title')} category will be published soon on Herald News Today."
    )
    seo_results = {
        "page": assert_seo("page", routes["page"], page.get("seo"), page.get("title") or site_title, config.get("seo", {}).get("description") or "", f"{SITE}/", failures),
        "blog": assert_seo("blog", routes["blog"], blog.get("seo"), blog.get("title") or "", blog.get("description") or "", "/blog/editorial-independence-and-sustainability/", failures),
        "category": assert_seo("category", routes["category"], category.get("seo"), f"{category.get('title')} Articles | {site_title}", category_description, "/business/", failures),
        "user": assert_seo("user", routes["user"], user.get("seo"), f"{user.get('name')} Articles | {site_title}", user.get("bio") or f"Read the latest articles by {user.get('name')} from Herald News Today.", "/author/admin/", failures),
    }
    for edge in data.get("blogs", {}).get("edges") or []:
        node = edge.get("node") or {}
        filename = str((node.get("_sys") or {}).get("filename") or "").removesuffix(".mdx")
        if not filename:
            failures.append("blogConnection returned a document without _sys.filename")
            continue
        route_key = f"blog:{filename}"
        blog_route = routes["blog"] if filename == "editorial-independence-and-sustainability" else fetch_route(f"/blog/{filename}/")
        routes[route_key] = blog_route
        assert_text(f"{route_key}.title", blog_route["html"], node.get("title") or "", failures)
        expected_categories = []
        for reference in node.get("categories") or []:
            stem = Path(str(reference).replace("\\", "/")).stem
            expected_categories.append({"label": stem.casefold(), "slug": stem.casefold(), "href": f"/{stem.casefold()}/"})
        actual_categories = [
            {"label": item.get("label", "").strip().casefold(), "slug": item.get("slug", "").strip().casefold(), "href": item.get("href", "")}
            for item in blog_route["head"].article_categories
        ]
        if actual_categories != expected_categories:
            failures.append(f"MULTICAT-LOCK {filename}: backend={expected_categories!r}, public={actual_categories!r}")
    assert_text("category.title", routes["category"]["html"], category.get("title") or "", failures)
    assert_text("user.name", routes["user"]["html"], user.get("name") or "", failures)
    assert_text("user.role", routes["user"]["html"], user.get("role") or "", failures)
    assert_text("navigation.items[0].label", routes["page"]["html"], data["navigation"]["items"][0]["label"], failures)
    assert_text("config.seo.title", routes["page"]["html"], config.get("seo", {}).get("title") or "", failures)
    config_logo = config.get("seo", {}).get("logo") or ""
    if config_logo:
        assert_text("config.seo.logo", routes["page"]["html"], config_logo, failures)
    for field in ("ctaEyebrow", "ctaTitle", "ctaText", "ctaButtonText"):
        assert_text(f"config.footer.{field}", routes["page"]["html"], (config.get("footer") or {}).get(field) or "", failures)
    for field in ("title", "description", "buttonText"):
        assert_text(f"config.notFound.{field}", routes["notFound"]["html"], (config.get("notFound") or {}).get(field) or "", failures)

    report = {"site": SITE, "configuredCollections": sorted(configured), "requiredCollections": sorted(REQUIRED), "coverageComplete": configured == REQUIRED, "collections": {name: {"backendDocument": data.get(name, {}).get("_sys", {}).get("filename"), "status": "PASS" if data.get(name) else "FAIL"} for name in sorted(REQUIRED)}, "routes": {name: {"status": route["status"], "cache": route["cache"]} for name, route in routes.items()}, "seo": seo_results, "failures": failures}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"TINA_FULLCHECK_OK {not failures}")
    return 0 if not failures else 1


if __name__ == "__main__": raise SystemExit(main())
