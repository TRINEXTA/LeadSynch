import os

for filename in os.listdir('.'):
    if filename.endswith('.jsx'):
        filepath = os.path.join('.', filename)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remplacer LeadSyncClient par LeadSynchClient
        content = content.replace('LeadSyncClient', 'LeadSynchClient')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'Corrige: {filename}')

print('Termine!')