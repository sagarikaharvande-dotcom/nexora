"""Transparent hybrid matcher. Pure-Python TF-IDF + cosine (no ML training involved).
Weights are configurable heuristics, not tuned values."""
import math, re
from collections import Counter
WEIGHTS = {"topic": .4, "skill": .3, "relevance": .2, "domain": .1}
STOP = set("the a an and or of to in for with on is are be by as at from this that we our".split())

def toks(t): return [w for w in re.findall(r"[a-z0-9\+#]+", (t or "").lower()) if w not in STOP and len(w) > 1]
def tags(s): return {x.strip().lower() for x in (s or "").split(",") if x.strip()}

def _tfidf(docs):
    df = Counter(w for d in docs for w in set(d)); n = len(docs)
    return [{w: c * (math.log((1 + n) / (1 + df[w])) + 1) for w, c in Counter(d).items()} for d in docs]

def _cos(a, b):
    num = sum(v * b.get(k, 0) for k, v in a.items())
    den = math.sqrt(sum(v*v for v in a.values())) * math.sqrt(sum(v*v for v in b.values()))
    return num / den if den else 0.0

def rank(project, candidates):
    """project/candidates: dicts. Returns sorted [{user_id, score, parts, explanation}]."""
    ptxt = toks(" ".join([project["title"], project["summary"], project["description"], project["domains"]]))
    topic_docs = [toks(c["interests"]) for c in candidates]
    rel_docs = [toks(c["bio"] + " " + c["skills"]) for c in candidates]
    vt = _tfidf([ptxt] + topic_docs); vr = _tfidf([ptxt] + rel_docs)
    req, pdom = tags(project["skills"]), tags(project["domains"])
    out = []
    for i, c in enumerate(candidates):
        have, cdom = tags(c["skills"]), tags(c["domains"]) | tags(c["interests"])
        topic, rel = _cos(vt[0], vt[i+1]), _cos(vr[0], vr[i+1])
        covered = req & have
        skill = len(covered) / len(req) if req else 0.0          # missing info -> 0, not a guess
        dom = len(pdom & cdom) / len(pdom) if pdom else 0.0
        parts = {"topic": topic, "skill": skill, "relevance": rel, "domain": dom}
        score = sum(WEIGHTS[k] * min(1, v) for k, v in parts.items())
        shared = sorted(set(ptxt) & set(topic_docs[i]))[:4]
        bits = []
        if covered: bits.append("covers required skills: " + ", ".join(sorted(covered)))
        if pdom & cdom: bits.append("works in " + ", ".join(sorted(pdom & cdom)))
        if shared: bits.append("research interests overlap on: " + ", ".join(shared))
        out.append({"user_id": c["id"], "score": round(score * 100), "parts": {k: round(v, 2) for k, v in parts.items()},
                    "explanation": ("Match: " + "; ".join(bits) + ".") if bits else "Weak match: little profile overlap with this project."})
    return sorted(out, key=lambda x: -x["score"])
