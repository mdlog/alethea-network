#!/usr/bin/env python3
import re

# Read the file
with open('alethea-website/app/page.tsx', 'r') as f:
    content = f.read()

# Fix all malformed JSX tags - more comprehensive
content = re.sub(r'< ([a-z]+) className = "', r'<\1 className="', content)
content = re.sub(r'< ([a-z]+)\.([a-z]+)\s*\n', r'<\1.\2\n', content)  # Fix < motion.div with newline
content = re.sub(r'< ([a-z]+) id = "', r'<\1 id="', content)
content = re.sub(r' className = "', r' className="', content)
content = re.sub(r' id = "', r' id="', content)
content = re.sub(r' style = {{', r' style={{', content)
content = re.sub(r'{/\* (.*?) \*/ }', r'{/* \1 */}', content)  # Fix comment spacing
content = re.sub(r'</([a-z]+) >', r'</\1>', content)  # Fix closing tags
content = re.sub(r'</([a-z]+)\.([a-z]+) >', r'</\1.\2>', content)  # Fix closing tags with dot
content = re.sub(r'initial = {{', r'initial={{', content)
content = re.sub(r'animate = {{', r'animate={{', content)
content = re.sub(r'transition = {{', r'transition={{', content)
content = re.sub(r'viewport = {{', r'viewport={{', content)
content = re.sub(r'whileInView = {{', r'whileInView={{', content)

# Write back
with open('alethea-website/app/page.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed all JSX syntax errors!")
