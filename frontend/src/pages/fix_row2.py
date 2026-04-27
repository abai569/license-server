import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

file_path = 'Dashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Regex to find the closing of the last td and tr in the map loop
# We look for the </button>, </div>, </td> sequence followed by </tr> and ))
# The indentation is likely 10 spaces for </button>, 18 for </div>, 14 for </td> etc.
# Let's just find </td>\n                  </tr>\n                ))
# Wait, let's look at the file content again.
# Line 297: </td>
# Line 298: </tr>
# Line 299: ))

# Replace </td>\n                  </tr>\n                )) with </td>\n                  <td></td>\n                </tr>\n                ))

pattern = r'(</div>\s*<td\s*className="px-6 py-4 whitespace-nowrap text-sm">[\s\S]*?编辑[\s\S]*?删除[\s\S]*?</div>\s*</td>)(\s*</tr>)'

def replacer(match):
    return match.group(1) + '\n                      <td></td>' + match.group(2)

new_content = re.sub(pattern, replacer, content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Alignment fixed")
else:
    print("No change made")

print("Done")
