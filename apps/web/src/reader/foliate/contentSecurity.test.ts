import { beforeAll, describe, expect, it } from "bun:test";

import { installBookContentSecurity, isBookMarkupType, sanitizeBookMarkup, secureSections } from "./contentSecurity";
import { ensureTestDom } from "./testEnv";

beforeAll(() => {
  ensureTestDom();
});

const XHTML = "application/xhtml+xml";

describe("sanitizeBookMarkup", () => {
  it("removes scripts and handlers and puts the CSP first in <head>", () => {
    const out = sanitizeBookMarkup(
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title><script>alert(1)</script></head>' +
        '<body onload="x()"><p onclick="y()">hi</p><a href="javascript:z()">l</a></body></html>',
      XHTML
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onload");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
    expect(out.indexOf("Content-Security-Policy")).toBeLessThan(out.indexOf("<title>"));
    expect(out).toContain("<p>hi</p>");
  });

  it("is not fooled by a <head> inside a comment or doctype", () => {
    const out = sanitizeBookMarkup(
      '<!-- <head> --><!DOCTYPE html SYSTEM "<head>"><html xmlns="http://www.w3.org/1999/xhtml"><head></head><body><script>x()</script></body></html>',
      XHTML
    );
    expect(out).not.toContain("<script");
    expect(out).toMatch(/<head[^>]*><meta http-equiv="Content-Security-Policy"/);
  });

  it("creates a <head> when missing", () => {
    const out = sanitizeBookMarkup('<html xmlns="http://www.w3.org/1999/xhtml"><body><p>x</p></body></html>', XHTML);
    expect(out).toMatch(/<head><meta http-equiv="Content-Security-Policy"/);
  });

  it("strips every script vector from SVG documents", () => {
    const out = sanitizeBookMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" onload="a()">' +
        '<svg:script>b()</svg:script><script>c()</script><a href="javascript:d()"><circle r="1" onmouseover="e()"/></a></svg>',
      "image/svg+xml"
    );
    expect(out).not.toMatch(/script|onload|onmouseover|javascript:/);
    expect(out).toContain("<circle");
  });

  it("removes nested frames and plugin elements", () => {
    const out = sanitizeBookMarkup(
      '<html xmlns="http://www.w3.org/1999/xhtml"><head/><body><iframe src="x.svg"/><object data="y"/><embed src="z"/></body></html>',
      XHTML
    );
    expect(out).not.toMatch(/<(iframe|object|embed)/);
    expect(out).toContain("frame-src 'none'");
  });

  it("sanitizes malformed XHTML via the HTML parser instead of passing it through", () => {
    const out = sanitizeBookMarkup("<html><body><p>unclosed<script>x()</script></body></html>", XHTML);
    expect(out).not.toContain("<script");
  });

  it("is idempotent", () => {
    const once = sanitizeBookMarkup('<html xmlns="http://www.w3.org/1999/xhtml"><head/><body/></html>', XHTML);
    expect(sanitizeBookMarkup(once, XHTML).match(/Content-Security-Policy/g)).toHaveLength(1);
  });
});

describe("isBookMarkupType", () => {
  it("matches markup types and ignores parameters", () => {
    expect(isBookMarkupType("text/html; charset=utf-8")).toBe(true);
    expect(isBookMarkupType("image/svg+xml")).toBe(true);
    expect(isBookMarkupType("text/css")).toBe(false);
    expect(isBookMarkupType("image/png")).toBe(false);
    // Untyped resources are sniffed before being treated as markup.
    expect(isBookMarkupType(undefined)).toBe(true);
  });
});

describe("installBookContentSecurity", () => {
  it("sanitizes markup resources and leaves others alone", async () => {
    const target = new EventTarget();
    installBookContentSecurity({ transformTarget: target });
    const html = { data: Promise.resolve('<html xmlns="http://www.w3.org/1999/xhtml"><head/><body><script>x()</script></body></html>'), type: XHTML };
    target.dispatchEvent(new CustomEvent("data", { detail: html }));
    expect(await html.data).not.toContain("<script");
    const css = { data: "body{}", type: "text/css" };
    target.dispatchEvent(new CustomEvent("data", { detail: css }));
    expect(await css.data).toBe("body{}");
  });
});

describe("secureSections", () => {
  it("serves a sanitized copy of each section and caches it", async () => {
    const raw = URL.createObjectURL(
      new Blob(['<html xmlns="http://www.w3.org/1999/xhtml"><head/><body><script>x()</script><p>ok</p></body></html>'], { type: XHTML })
    );
    const section = { load: () => raw };
    secureSections([section]);
    const url = await section.load();
    expect(url).not.toBe(raw);
    expect(await section.load()).toBe(url);
    const text = await (await fetch(url)).text();
    expect(text).not.toContain("<script");
    expect(text).toContain("<p>ok</p>");
  });

  it("leaves non-markup sections untouched", async () => {
    const raw = URL.createObjectURL(new Blob(["x"], { type: "image/png" }));
    const section = { load: () => raw };
    secureSections([section]);
    expect(await section.load()).toBe(raw);
  });
});

describe("sanitizer bypass attempts", () => {
  const SVG = "image/svg+xml";
  it("catches obfuscated and namespaced javascript: links in SVG", () => {
    const out = sanitizeBookMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:x="http://www.w3.org/1999/xlink">' +
        '<a xlink:href="java&#9;script:alert(1)"><text>a</text></a><a x:href=" JaVaScRiPt:alert(2)"><text>b</text></a></svg>',
      SVG
    );
    expect(out.toLowerCase()).not.toContain("script:");
    expect(out).toContain("<text>a</text>");
  });

  it("removes SVG animations that set handlers or link targets", () => {
    const out = sanitizeBookMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg"><a><set attributeName="xlink:href" to="javascript:x()"/>' +
        '<animate attributeName="onmouseover" values="x()"/><animate attributeName="opacity" values="0;1"/></a></svg>',
      SVG
    );
    expect(out).not.toMatch(/<set|onmouseover|javascript:/);
    expect(out).toContain('attributeName="opacity"');
  });

  it("drops XSLT processing instructions but keeps CSS ones", () => {
    const out = sanitizeBookMarkup(
      '<?xml-stylesheet type="text/xsl" href="x.xsl"?><?xml-stylesheet type="text/css" href="a.css"?><svg xmlns="http://www.w3.org/2000/svg"/>',
      SVG
    );
    expect(out).not.toContain("text/xsl");
    expect(out).toContain("text/css");
  });

  it("drops meta refresh and <base>", () => {
    const out = sanitizeBookMarkup(
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="refresh" content="0;url=javascript:x()"/><base href="https://evil/"/></head><body/></html>',
      XHTML
    );
    expect(out).not.toMatch(/refresh|<base/);
    expect(out).toContain("Content-Security-Policy");
  });

  it("sanitizes arbitrary +xml types and untyped markup", () => {
    const xml = sanitizeBookMarkup('<doc xmlns:h="http://www.w3.org/1999/xhtml"><h:script>x()</h:script></doc>', "application/x-foo+xml");
    expect(xml).not.toContain("script");
    expect(isBookMarkupType("application/x-foo+xml")).toBe(true);
    expect(isBookMarkupType("")).toBe(true);
  });

  it("leaves untyped binary sections alone", async () => {
    const raw = URL.createObjectURL(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]));
    const section = { load: () => raw };
    secureSections([section]);
    expect(await section.load()).toBe(raw);
  });
});

describe("malformed media types", () => {
  it("treats comma-joined or invalid types as unknown (sniffed)", async () => {
    const raw = URL.createObjectURL(
      new Blob(['<html><body><img src=x onerror="x()"><script>y()</script></body></html>'], { type: "text/plain,text/html" })
    );
    const section = { load: () => raw };
    secureSections([section]);
    const url = await section.load();
    expect(url).not.toBe(raw);
    const text = await (await fetch(url)).text();
    expect(text).not.toMatch(/onerror|<script/);
  });

  it("sanitizes a section that starts like markup even with a non-markup type", async () => {
    const raw = URL.createObjectURL(new Blob(["<html><body><script>x()</script></body></html>"], { type: "text/css" }));
    const section = { load: () => raw };
    secureSections([section]);
    const text = await (await fetch(await section.load())).text();
    expect(text).not.toContain("<script");
  });
});
