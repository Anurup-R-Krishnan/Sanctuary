import zipfile

def create_epub(filename):
    with zipfile.ZipFile(filename, 'w') as zf:
        zf.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        zf.writestr('META-INF/container.xml', '''<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>''')
        zf.writestr('content.opf', '''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>Snoopy's Guide to Life</dc:title>
        <dc:language>en</dc:language>
        <dc:identifier id="BookID" opf:scheme="UUID">urn:uuid:12345</dc:identifier>
        <dc:creator>Charles M. Schulz</dc:creator>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="page1" href="page1.html" media-type="application/xhtml+xml"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="page1"/>
    </spine>
</package>''')
        zf.writestr('toc.ncx', '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN"
 "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
</head>
<docTitle>
  <text>Snoopy's Guide</text>
</docTitle>
<navMap>
  <navPoint id="navPoint-1" playOrder="1">
    <navLabel>
      <text>Start</text>
    </navLabel>
    <content src="page1.html"/>
  </navPoint>
</navMap>
</ncx>''')
        zf.writestr('page1.html', '<html><body><h1>Hello Snoopy!</h1></body></html>')

if __name__ == "__main__":
    create_epub("dummy.epub")
    print("Created dummy.epub")
