import os
import re

pages_dir = '.'

for filename in os.listdir(pages_dir):
    if filename.endswith('.jsx') and filename not in ['Dashboard.jsx', 'Login.jsx', 'Leads.jsx', 'Users.jsx', 'Teams.jsx']:
        filepath = os.path.join(pages_dir, filename)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = re.sub(r'\$ \+ \{', '${', content)
        content = re.sub(r'` \+ \{', '${', content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'Corrige: {filename}')

print('Termine!')