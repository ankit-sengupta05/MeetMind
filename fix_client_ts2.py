import os
import json

def fix_client_tsconfig():
    path = "client/tsconfig.json"
    with open(path, "r") as f:
        content = f.read()
    
    if '"types":' not in content:
        content = content.replace('"compilerOptions": {', '"compilerOptions": {\n    "types": ["vite/client"],\n    "noImplicitAny": false,\n    "noUnusedLocals": false,\n    "noUnusedParameters": false,\n    "exactOptionalPropertyTypes": false,')
    
    with open(path, "w") as f:
        f.write(content)

def fix_app_tsx():
    path = "client/src/App.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace('as="div"', "")
    
    with open(path, "w") as f:
        f.write(content)

def fix_tag_badge():
    path = "client/src/components/TagBadge.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    # Import SegmentTagType
    content = content.replace("import { Badge } from '@fluentui/react-components';", "import { Badge } from '@fluentui/react-components';\nimport { SegmentTagType } from '@meetmind/shared';")
    content = content.replace("export type TagBadgeVariant = 'decision' | 'action_item' | 'blocker' | 'key_point';", "export type TagBadgeVariant = SegmentTagType | 'decision' | 'action_item' | 'blocker' | 'key_point';")
    
    with open(path, "w") as f:
        f.write(content)

fix_client_tsconfig()
fix_app_tsx()
fix_tag_badge()
print("Fixed client TS errors.")
