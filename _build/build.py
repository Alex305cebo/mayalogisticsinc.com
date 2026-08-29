# -*- coding: utf-8 -*-
"""Render one page per language from template.html + i18n.

    python _build/build.py

Writes /index.html (English) and /<code>/index.html for the rest, plus
sitemap.xml. Everything under _build/ is ignored by GitHub Pages (Jekyll skips
underscore-prefixed folders), so the sources never ship with the site.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import i18n  # noqa: E402
from lang_uk import D as UK  # noqa: E402
from lang_ro import D as RO  # noqa: E402
from lang_kk import D as KK  # noqa: E402

i18n.T['uk'] = UK
i18n.T['ro'] = RO
i18n.T['kk'] = KK

VER = '5'          # cache-buster for site.css / site.js
SITE = 'https://mayalogisticsinc.com'
TODAY = '2026-08-27'


def hreflangs(langs):
    out = []
    for code, path, _name, _loc in langs:
        out.append('<link rel="alternate" hreflang="%s" href="%s%s">' % (code, SITE, path))
    out.append('<link rel="alternate" hreflang="x-default" href="%s/">' % SITE)
    return '\n'.join(out)


def switcher(langs, current, label):
    """A <details> dropdown: six languages do not fit as pills, and this needs
    no JavaScript to open."""
    cur_name = next(n for c, _p, n, _l in langs if c == current)
    items = []
    for code, path, name, _loc in langs:
        mark = ' aria-current="true"' if code == current else ''
        items.append('            <li><a href="%s" hreflang="%s"%s>%s</a></li>' % (path, code, mark, name))
    return (
        '        <details class="lang">\n'
        '          <summary aria-label="%s">%s</summary>\n'
        '          <ul>\n%s\n          </ul>\n'
        '        </details>' % (label, cur_name, '\n'.join(items))
    )


def phoneblock(code):
    """Nothing here carries the number in readable form — only the encoded blob
    and the translated wording around it. JavaScript fills the link in when the
    application is actually submitted."""
    if not i18n.CONTACT_ENC.strip():
        return ''
    label, note = i18n.PHONE_TEXT[code]
    return '\n'.join([
        '    <div class="mbox-phone" data-mbox-phone data-p="%s" hidden>' % i18n.CONTACT_ENC,
        '      <small>%s</small>' % label,
        '      <a href="#" data-mbox-tel></a>',
        '      <span>%s</span>' % note,
        '    </div>',
    ])


def main():
    tpl = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
    langs = i18n.LANGS
    written = []

    for code, path, _name, locale in langs:
        t = dict(i18n.T[code])
        t['lang'] = code
        t['path'] = path
        t['locale'] = locale
        t['ver'] = VER
        t['hreflangs'] = hreflangs(langs)
        t['langswitch'] = switcher(langs, code, t['lang_label'])
        t['phoneblock'] = phoneblock(code)

        page = tpl
        for key, val in t.items():
            page = page.replace('{{%s}}' % key, str(val))

        left = re.findall(r'\{\{(\w+)\}\}', page)
        if left:
            raise SystemExit('!! unfilled placeholders in %s: %s' % (code, sorted(set(left))))

        out = os.path.join(ROOT, 'index.html') if path == '/' else os.path.join(ROOT, path.strip('/'), 'index.html')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w', encoding='utf-8', newline='\n').write(page)
        written.append((code, out, len(page)))

    # sitemap: every page lists every language, so search engines pair them up
    alts = '\n'.join(
        '    <xhtml:link rel="alternate" hreflang="%s" href="%s%s"/>' % (c, SITE, p)
        for c, p, _n, _l in langs
    ) + '\n    <xhtml:link rel="alternate" hreflang="x-default" href="%s/"/>' % SITE

    urls = []
    for code, path, _n, _l in langs:
        urls.append(
            '  <url>\n    <loc>%s%s</loc>\n%s\n    <lastmod>%s</lastmod>\n'
            '    <priority>%s</priority>\n  </url>' % (SITE, path, alts, TODAY, '1.0' if path == '/' else '0.9')
        )
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
               '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n%s\n</urlset>\n' % '\n'.join(urls))
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8', newline='\n').write(sitemap)

    for code, out, size in written:
        print('%-3s -> %-42s %5d B' % (code, os.path.relpath(out, ROOT), size))
    print('sitemap.xml -> %d urls' % len(langs))


if __name__ == '__main__':
    main()
