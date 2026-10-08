import xml.etree.ElementTree as ET
import zipfile
import sys

sys.stdout.reconfigure(encoding='utf-8')

def parse_docx(doc_path):
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    try:
        with zipfile.ZipFile(doc_path, 'r') as z:
            with z.open('word/document.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                
                for p in root.findall('.//w:p', ns):
                    text_nodes = p.findall('.//w:t', ns)
                    text = ''.join(t.text for t in text_nodes if t.text)
                    if not text.strip(): continue
                    print(f"TEXT: {text[:60]}")
                    
                    pPr = p.find('./w:pPr', ns)
                    if pPr is not None:
                        ind = pPr.find('./w:ind', ns)
                        if ind is not None:
                            print(f"  INDENT: {ind.attrib}")
                        jc = pPr.find('./w:jc', ns)
                        if jc is not None:
                            print(f"  ALIGN: {jc.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')}")
                        spacing = pPr.find('./w:spacing', ns)
                        if spacing is not None:
                            print(f"  SPACING: {spacing.attrib}")

                    # Find all runs and check their sizes
                    r_list = p.findall('.//w:r', ns)
                    for r in r_list:
                        r_text_node = r.find('.//w:t', ns)
                        if r_text_node is None or not r_text_node.text.strip():
                            continue
                        rPr = r.find('.//w:rPr', ns)
                        if rPr is not None:
                            sz = rPr.find('./w:sz', ns)
                            if sz is not None:
                                print(f"  RUN TEXT: '{r_text_node.text}' -> SIZE: {sz.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')} (half-pts)")
                            else:
                                print(f"  RUN TEXT: '{r_text_node.text}' -> NO SZ (default)")
                    print("---")
    except Exception as e:
        print(f"Error: {e}")

parse_docx('mucluc v.docx')
