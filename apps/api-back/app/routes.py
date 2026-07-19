import os
import re
import json
from functools import lru_cache

import pandas as pd

from fastapi import APIRouter, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate

from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq

router = APIRouter()

# =====================================================
# Modèle requête
# =====================================================
class QueryRequest(BaseModel):
    question: str

# =====================================================
# Nettoyage
# =====================================================
def clean_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()

# =====================================================
# Loaders
# =====================================================
def load_pdf(path: str, title: str):
    loader = PyPDFLoader(path)
    docs = []
    for page_num, page in enumerate(loader.load()):
        cleaned = clean_text(page.page_content)
        if cleaned:
            docs.append(Document(
                page_content=cleaned,
                metadata={"source": path, "title": title, "page": page_num + 1}
            ))
    return docs

def load_docx(path: str, title: str):
    loader = Docx2txtLoader(path)
    docs = []
    for i, doc in enumerate(loader.load()):
        cleaned = clean_text(doc.page_content)
        if cleaned:
            docs.append(Document(
                page_content=cleaned,
                metadata={"source": path, "title": title, "page": i + 1}
            ))
    return docs

def load_xlsx(path: str, title: str):
    docs = []
    xl = pd.ExcelFile(path)
    
    # Header différent selon la feuille
    header_map = {
        "Hierarchie": 3,          # vrais noms à la ligne 3
        "Reglement Interieur": 2,
        "Conges & Avantages": 2,
    }
    
    for sheet_name in xl.sheet_names:
        header_row = header_map.get(sheet_name, 2)
        df = xl.parse(sheet_name, header=header_row).fillna("")

        # Supprimer colonnes Unnamed
        df.columns = [str(c).strip() for c in df.columns]
        df = df.loc[:, ~df.columns.str.startswith("Unnamed")]

        # Supprimer lignes vides
        df = df[df.apply(lambda row: any(str(v).strip() for v in row), axis=1)]

        for idx, row in df.iterrows():
            row_str = " | ".join(
                f"{col}: {val}"
                for col, val in row.items()
                if str(val).strip()
            )
            if row_str:
                full_text = f"Feuille: {sheet_name} | {row_str}"
                docs.append(Document(
                    page_content=clean_text(full_text),
                    metadata={
                        "source": path,
                        "title": title,
                        "page": f"{sheet_name} - ligne {idx + header_row + 2}"
                    }
                ))
    return docs

def load_json(path: str, title: str):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def to_lines(obj, prefix=""):
        lines = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    lines.extend(to_lines(v, f"{prefix}{k} > "))
                else:
                    lines.append(f"{prefix}{k}: {v}")
        elif isinstance(obj, list):
            for item in obj:
                lines.extend(to_lines(item, prefix))
        return lines

    all_lines = to_lines(data)

    docs = []
    bloc_size = 15
    overlap = 5   # ← les 5 dernières lignes du bloc précédent sont répétées

    i = 0
    bloc_num = 1
    while i < len(all_lines):
        bloc = all_lines[i:i + bloc_size]
        text = clean_text(" | ".join(bloc))
        if text:
            docs.append(Document(
                page_content=text,
                metadata={"source": path, "title": title, "page": f"bloc_{bloc_num}"}
            ))
        i += (bloc_size - overlap)   # ← avance de 10 lignes (15-5)
        bloc_num += 1

    print(f"  → {len(docs)} blocs extraits du JSON")
    return docs

def load_document(path: str, title: str):
    ext = os.path.splitext(path)[1].lower()
    loaders = {".pdf": load_pdf, ".docx": load_docx, ".xlsx": load_xlsx, ".json": load_json}
    loader_fn = loaders.get(ext)
    if not loader_fn:
        print(f"⚠️ Extension {ext} non supportée.")
        return []
    return loader_fn(path, title)

# =====================================================
# Runtime configuration
# =====================================================
DOCUMENTS = [
    {"path": "app/documents/organigramme_techsolutions.xlsx", "title": "Organigramme & Hiérarchie"},
    {"path": "app/documents/reglement_hierarchie.docx", "title": "Règlement & Hiérarchie"},
    {"path": "app/documents/reglement_interne.pdf", "title": "Règlement Intérieur"},
    {"path": "app/documents/techsolutions_data.json", "title": "Données RH Entreprise"},
]
CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIRECTORY") or os.getenv("CHROMA_DIR", "MyDB_RH")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
chat_history = []

PROMPT_TEMPLATE = """
Tu es un assistant RH interne de TECHSOLUTIONS.
Réponds uniquement à partir du contexte fourni ci-dessous.
Le contexte contient des données JSON avec des salaires, des postes, et des règlements.
Cherche attentivement dans tout le contexte avant de répondre.
Si la réponse n'existe pas dans le contexte, réponds exactement :
"Je n'ai pas trouvé cette information dans les documents RH disponibles."

Contexte:
{context}

Historique:
{chat_history}

Question:
{question}

Réponse:
"""

prompt_template = PromptTemplate(
    input_variables=["context", "chat_history", "question"],
    template=PROMPT_TEMPLATE
)


def _load_corpus():
    all_docs = []
    json_docs = []

    for doc in DOCUMENTS:
        if not os.path.exists(doc["path"]):
            print(f"⚠️ {doc['path']} introuvable.")
            continue

        loaded = load_document(doc["path"], doc["title"])
        if doc["path"].endswith(".json"):
            json_docs.extend(loaded)
        else:
            all_docs.extend(loaded)
        print(f"✅ {len(loaded)} pages chargées depuis {doc['path']}")

    if not all_docs and not json_docs:
        raise RuntimeError("Aucun document RH chargé.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=300)
    final_docs = splitter.split_documents(all_docs)
    all_final = final_docs + json_docs
    return list({doc.page_content: doc for doc in all_final}.values())


@lru_cache(maxsize=1)
def get_rag_runtime():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY non définie.")

    unique_docs = _load_corpus()
    embedding_function = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    # Existing persistence is opened in place and is never deleted automatically.
    if os.path.isdir(CHROMA_DIR) and os.listdir(CHROMA_DIR):
        vectorstore = Chroma(
            collection_name="langchain",
            embedding_function=embedding_function,
            persist_directory=CHROMA_DIR,
        )
    else:
        vectorstore = Chroma.from_documents(
            unique_docs,
            embedding_function,
            persist_directory=CHROMA_DIR,
        )

    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={"k": 10, "fetch_k": 30, "lambda_mult": 0.5},
    )
    groq_llm = ChatGroq(
        model_name=GROQ_MODEL,
        groq_api_key=api_key,
    )
    return unique_docs, retriever, groq_llm


def _readiness_checks() -> dict[str, bool]:
    chroma_parent = os.path.dirname(os.path.abspath(CHROMA_DIR)) or "."
    chroma_exists = os.path.isdir(CHROMA_DIR)
    chroma_parent_writable = os.path.isdir(chroma_parent) and os.access(chroma_parent, os.W_OK)

    return {
        "groq_api_key_configured": bool(os.getenv("GROQ_API_KEY")),
        "documents_available": all(os.path.exists(doc["path"]) for doc in DOCUMENTS),
        "chroma_path_ready": chroma_exists or chroma_parent_writable,
    }


@router.get("/healthz")
def healthz():
    return {"status": "ok"}


@router.get("/readyz")
def readyz():
    checks = _readiness_checks()
    if not all(checks.values()):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "checks": checks},
        )

    return {"status": "ready", "checks": checks}

# =====================================================
# Endpoint /chat
# =====================================================
@router.post("/chat")
def chat(request: QueryRequest):
    try:
        unique_docs, retriever, groq_llm = get_rag_runtime()
        question = request.question

        # 1. Récupération MMR
        source_docs = retriever.invoke(question)

        # 2. Recherche par mot-clé (filet de sécurité)
        question_lower = question.lower()
        keywords = question_lower.split()

        extra_docs = []
        for doc in unique_docs:
            content_lower = doc.page_content.lower()
            matches = sum(1 for kw in keywords if len(kw) > 3 and kw in content_lower)
            if matches >= 2:
                already_in = any(d.page_content == doc.page_content for d in source_docs)
                if not already_in:
                    extra_docs.append(doc)

        # Combiner MMR + keyword (max 5 extra)
        source_docs = source_docs + extra_docs[:5]

        print("\n===== CHUNKS RÉCUPÉRÉS =====")
        for i, doc in enumerate(source_docs, 1):
            print(f"\n[{i}] Source: {doc.metadata.get('title')} | Page: {doc.metadata.get('page')}")
            print(f"    Contenu: {doc.page_content[:200]}")
        print("============================\n")

        if not source_docs:
            return {
                "response": "Je n'ai pas trouvé cette information dans les documents RH disponibles.",
                "sources": []
            }

        # Contexte dédupliqué
        seen = set()
        context_parts = []
        for doc in source_docs:
            if doc.page_content not in seen:
                seen.add(doc.page_content)
                context_parts.append(doc.page_content)

        context = "\n\n".join(context_parts)

        # Historique
        history_text = "\n".join(
            f"{m['role']}: {m['content']}" for m in chat_history[-6:]
        ) or "Aucun historique"

        # Appel LLM
        final_prompt = prompt_template.format(
            context=context,
            chat_history=history_text,
            question=question
        )
        answer = groq_llm.invoke(final_prompt).content

        # Sauvegarde historique
        chat_history.append({"role": "user",      "content": question})
        chat_history.append({"role": "assistant",  "content": answer})

        # Sources
        seen_sources = set()
        sources = []
        for doc in source_docs:
            key = (doc.metadata.get("source", ""), str(doc.metadata.get("page", "")))
            if key not in seen_sources:
                seen_sources.add(key)
                sources.append({
                    "title":  doc.metadata.get("title",  "Inconnu"),
                    "source": doc.metadata.get("source", "Inconnu"),
                    "page":   doc.metadata.get("page",   "Inconnue"),
                })

        return jsonable_encoder({"response": answer})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# Endpoint /reset
# =====================================================
@router.delete("/chat/reset")
def reset_history():
    chat_history.clear()
    return {"message": "Historique effacé."}
