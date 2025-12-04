import re
import os

# Read the source text
try:
    with open('web/moreinfo.txt', 'r', encoding='utf-8') as f:
        content = f.read()
except UnicodeDecodeError:
    with open('web/moreinfo.txt', 'r', encoding='latin-1') as f:
        content = f.read()

# Fix the replacement char issue seen in logs (REPLACEMENT CHARACTER) if any
# We'll replace it with a dash if it looks like a date range or hyphen
content = content.replace('\ufffd', '-')

# Headers to detect and format
# We use regex patterns to be robust against dashes/spaces
header_patterns = [
    r"1\.\s+Executive Summary",
    r"2\.\s+The Historical and Legislative Context of Drug Driving Enforcement",
    r"2\.1\s+The Evolution from Alcohol to Illicit Substances",
    r"2\.2\s+The \"Zero Tolerance\" Doctrine vs\. Impairment Reality",
    r"2\.3\s+Jurisdictional Heterogeneity",
    r"3\.\s+Epidemiology of Drug Driving: Crash Risk, Prevalence, and Trauma.*?", # Loose match for date
    r"3\.1\s+The Shift in Trauma Profiles",
    r"3\.2\s+The Drummer Studies and the Hierarchy of Risk",
    r"3\.3\s+Data Limitations and the \"Crash-Based\" Evaluation Gap",
    r"4\.\s+The Mechanics of Enforcement: Technology, Operations, and Validity",
    r"4\.1\s+Oral Fluid Screening Technology",
    r"4\.2\s+Operational Economics: Volume vs\. Intelligence",
    r"4\.3\s+The Laboratory Confirmation Bottleneck",
    r"5\.\s+Deterrence Theory and Behavioral Outcomes",
    r"5\.1\s+The Failure of General Deterrence for Drug Driving",
    r"5\.2\s+Specific Deterrence and Recidivism",
    r"6\.\s+The Medicinal Cannabis Conundrum.*?", # Loose match
    r"6\.1\s+Legislative Dissonance",
    r"6\.2\s+The Science of the \"Unimpaired\" Driver",
    r"6\.3\s+The Reform Movement and Jurisdictional Fragmentation",
    r"7\.\s+Socio-Legal Implications and Future Directions",
    r"7\.1\s+Economic and Social Impact",
    r"7\.2\s+Future Directions: Technology and Policy",
    r"7\.3\s+Recommendations",
    r"8\.\s+Conclusion"
]

# Step 1: Fix basic sticky chars and citation numbers
# "ambiguous.1 Unlike" -> "ambiguous. Unlike"
content = re.sub(r'\.(\d+)([A-Z])', r'. \2', content) # .3A -> . A
content = re.sub(r'\.(\d+)\s+', '. ', content) # .1 Unlike -> . Unlike
# "Efficacy1." -> "Efficacy\n\n1."
content = re.sub(r'([a-z])(\d+\.)', r'\1\n\n\2', content) 

# Step 2: Ensure headers are on their own lines
# Find headers and insert newlines before them if needed, and after them.
for pat in header_patterns:
    # Compile regex with "multiline" not needed if we search full string, but ignore case? No, headers are proper case.
    # We look for the pattern.
    
    # Identify the header in the text
    matches = list(re.finditer(pat, content))
    for m in matches:
        matched_text = m.group(0)
        
        # We want to replace "PrefixMatchedTextSuffix" with "Prefix\n\nMatchedText\n\nSuffix"
        # But we need to do this carefully not to mess up indices if we iterate.
        # Simpler: replace the matched text with unique marker + matched text + unique marker?
        # Or just use re.sub with a function that checks context?
        pass

# Better approach: Loop through patterns and apply sub
for pat in header_patterns:
    # Pattern to find header that might be stuck to text
    # e.g. "TextHeaderBody" -> "Text\n\nHeader\n\nBody"
    
    # We use a group for the header
    regex = r'(.?)(' + pat + r')(.?)'
    
    def replace_func(m):
        prefix = m.group(1)
        header = m.group(2)
        suffix = m.group(3)
        
        # Determine if we need newlines
        new_header = header
        
        # If prefix is not a newline/space, add newline
        if prefix.strip():
            new_header = '\n\n' + new_header
        else:
            new_header = prefix + new_header # Keep existing space/newline
            
        # If suffix is a capital letter (Start of body), add newline
        # "SummaryThe" -> suffix is 'T'
        if suffix.strip() and suffix[0].isupper():
            new_header = new_header + '\n\n' + suffix
        else:
            new_header = new_header + suffix
            
        return new_header

    # Apply replacement
    # Note: re.sub might process already processed parts, but headers are distinct.
    content = re.sub(pat + r'(?=[A-Z])', r'\g<0>\n\n', content) # Break header from body (Lookahead for Upper)
    content = re.sub(r'(?<=[a-z])' + pat, r'\n\n\g<0>', content) # Break header from previous text (Lookbehind for lower)
    
    # The above simple lookarounds might fail if pat is complex or variable length.
    # Let's rely on the specific "Header" -> "Header\n\n" logic.
    
    # Force break after header if it's followed by a char
    content = re.sub(r'(' + pat + r')([A-Z])', r'\1\n\n\2', content)

# Step 3: Parse and Format
lines = content.split('\n')
final_latex = ""

in_list = False

for line in lines:
    line = line.strip()
    if not line: continue
    
    # Determine type
    is_sec = False
    is_subsec = False
    
    # Check 1. Title
    if re.match(r'^\d+\.\s', line):
        # Section -> Latex Subsection (since we are putting it inside a Section)
        title = re.sub(r'^\d+\.\s+', '', line)
        final_latex += f"\\subsection{{{title}}}\n"
    # Check 1.1 Title
    elif re.match(r'^\d+\.\d+\s', line):
        # Subsection -> Latex Subsubsection
        title = re.sub(r'^\d+\.\d+\s+', '', line)
        final_latex += f"\\subsubsection{{{title}}}\n"
    else:
        # Body text
        # Clean up some latex special chars
        # % -> \%
        line = line.replace('%', '\\%')
        # $ -> \$ (Wait, the text had $ for costs? "$20 and $40")
        line = line.replace('$', '\\$')
        
        # Check for Tables? "Table 1: ..."
        if line.startswith("Table "):
            # We can't easily format tables from plain text without structure.
            # Just make it bold or italic
            final_latex += f"\\textbf{{{line}}}\n\n"
        else:
            final_latex += f"{line}\n\n"

# Wrap
section_header = "\\section{Strategic Context: Roadside Drug Testing in Australia (2016--2025)}\n"
section_intro = "% Extracted from Strategic Review\n\n"
final_latex = section_header + section_intro + final_latex

# Read design_book.tex
with open('design_book.tex', 'r', encoding='utf-8') as f:
    db_content = f.read()

# Insert before "Section 2: Data Processing" -> line 98 roughly
# We look for \section{Data Processing and Governance}
marker = r'\section{Data Processing and Governance}'

if marker in db_content:
    parts = db_content.split(marker)
    # parts[0] is everything before.
    # We append our new section, then the marker, then the rest.
    new_db_content = parts[0] + final_latex + "\n" + marker + parts[1]
    
    with open('design_book.tex', 'w', encoding='utf-8') as f:
        f.write(new_db_content)
    print("Successfully updated design_book.tex")
else:
    print("Could not find insertion marker in design_book.tex")
