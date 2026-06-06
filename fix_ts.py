import os
import re

def fix_auth():
    path = "server/src/middleware/auth.ts"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("const payload: NonNullable<AuthenticatedRequest['user']> = {", "const claims = decoded as Record<string, unknown>;\n      const payload: NonNullable<AuthenticatedRequest['user']> = {")
    with open(path, "w") as f:
        f.write(content)

def fix_routes_search():
    path = "server/src/routes/search.ts"
    with open(path, "r") as f:
        content = f.read()
    
    # searchRouter.handle -> searchRouter(req, res, () => {})
    content = content.replace("return searchRouter.handle(req, res, () => {});", "return searchRouter(req, res, () => {});")
    
    # rerankerScore
    # we need to build result object and add rerankerScore and highlights conditionally
    new_loop = """  for await (const result of searchResults.results) {
    const doc = result.document as Record<string, unknown>;
    const resItem: SearchResult = {
      meetingId: doc['id'] as string,
      title: doc['title'] as string,
      snippet: (result as { captions?: Array<{ text?: string }> }).captions?.[0]?.text ?? (doc['summaryText'] as string ?? '').slice(0, 200),
      score: result.score ?? 0,
      meetingDate: doc['startTime'] as string,
      participants: (doc['participantNames'] as string[] | undefined) ?? [],
      tags: (doc['tags'] as string[] | undefined) ?? [],
      type: doc['meetingType'] as string ?? 'other',
    };
    const reranker = (result as { rerankerScore?: number }).rerankerScore;
    if (reranker !== undefined) resItem.rerankerScore = reranker;
    if (result.highlights) resItem.highlights = result.highlights as Record<string, string[]>;
    
    results.push(resItem);
  }"""
    content = re.sub(r'  for await \(const result of searchResults.results\) \{.*?  \}', new_loop, content, flags=re.DOTALL)
    
    with open(path, "w") as f:
        f.write(content)

def fix_services_search():
    path = "server/src/services/search.ts"
    with open(path, "r") as f:
        content = f.read()
    
    # remove unused searchIndexClient
    content = re.sub(r'const searchIndexClient = new SearchIndexClient\(.*?\);\n+', '', content, flags=re.DOTALL)
    
    # remove highlightEnabled from captions
    content = content.replace("          highlightEnabled: true,\n", "")
    
    # fix object type cast in result
    content = content.replace("result.document.id as string", "(result.document as Record<string, unknown>).id as string")
    content = content.replace("result.document.title as string", "(result.document as Record<string, unknown>).title as string")
    content = content.replace("result.document.summaryText as string", "(result.document as Record<string, unknown>).summaryText as string")
    content = content.replace("result.semanticSearch?.rerankerScore", "(result as any).semanticSearch?.rerankerScore")
    
    with open(path, "w") as f:
        f.write(content)

def fix_tagger():
    path = "server/src/services/tagger.ts"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("SegmentTagType, ", "")
    
    # fix return
    content = content.replace("return { ...segment, tags: tags.length > 0 ? tags : undefined };", "const result: TaggedSegment = { ...segment };\n    if (tags.length > 0) result.tags = tags;\n    return result;")
    
    content = content.replace("tags: tagMap.get(s.id || '') || s.tags", "")
    content = content.replace("...s,", "        ...s,\n      };\n      const newTags = tagMap.get(s.id || '') || s.tags;\n      if (newTags) (res as TaggedSegment).tags = newTags;\n      return res as TaggedSegment;")
    content = content.replace("return segments.map(s => ({", "return segments.map(s => {\n      const res = {")
    content = content.replace("      }));", "      });")

    with open(path, "w") as f:
        f.write(content)

def fix_graph():
    path = "server/src/services/graph.ts"
    with open(path, "r") as f:
        content = f.read()
    content = content.replace("import { Meeting } from '@meetmind/shared';", "")
    with open(path, "w") as f:
        f.write(content)

fix_auth()
fix_routes_search()
fix_services_search()
fix_tagger()
fix_graph()
print("Fixed.")
