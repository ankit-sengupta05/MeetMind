import os

def fix_graph_ts():
    path = "server/src/services/graph.ts"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("import { ActionItem, Meeting } from '@meetmind/shared';", "import { ActionItem } from '@meetmind/shared';")
    
    with open(path, "w") as f:
        f.write(content)

fix_graph_ts()
print("Fixed graph ts.")
